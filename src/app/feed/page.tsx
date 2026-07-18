"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteField,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";
import Avatar from "@/components/Avatar";

type Post = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  likes: Record<string, boolean>;
  commentCount: number;
};

type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Feed() {
  const { user, member, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Post, "id">) })));
    });
    return () => unsubscribe();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !member || posting) return;
    setPosting(true);
    try {
      await addDoc(collection(db, "posts"), {
        authorId: user.uid,
        authorName: member.name,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        likes: {},
        commentCount: 0,
      });
      setText("");
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", postId));
  };

  // Simple toggle: tap the heart to like, tap again to unlike.
  const handleToggleLike = async (post: Post) => {
    if (!user) return;
    const postRef = doc(db, "posts", post.id);
    const alreadyLiked = !!post.likes?.[user.uid];
    if (alreadyLiked) {
      await updateDoc(postRef, { [`likes.${user.uid}`]: deleteField() });
    } else {
      await updateDoc(postRef, { [`likes.${user.uid}`]: true });
    }
  };

  const likeCount = (post: Post) => Object.keys(post.likes || {}).length;

  const toggleComments = (postId: string) => {
    const nowOpen = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: nowOpen }));

    if (nowOpen && !comments[postId]) {
      const q = query(
        collection(db, "posts", postId, "comments"),
        orderBy("createdAt", "asc")
      );
      onSnapshot(q, (snap) => {
        setComments((prev) => ({
          ...prev,
          [postId]: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, "id">) })),
        }));
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    const draft = (commentDrafts[postId] || "").trim();
    if (!draft || !user || !member) return;
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    await addDoc(collection(db, "posts", postId, "comments"), {
      authorId: user.uid,
      authorName: member.name,
      text: draft,
      createdAt: new Date().toISOString(),
    });
    await updateDoc(doc(db, "posts", postId), { commentCount: increment(1) });
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-steel">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar member={member} user={user} />

      <div className="px-6 py-8 md:px-12 max-w-2xl mx-auto">
        <p className="font-mono text-signal text-sm mb-2 tracking-widest">
          COMMUNITY
        </p>
        <h1 className="font-display text-5xl text-chalk mb-8">FEED</h1>

        {/* Composer */}
        <form
          onSubmit={handlePost}
          className="border border-steel/30 rounded-lg p-4 mb-8 flex gap-3"
        >
          <Avatar name={member?.name || "?"} size={40} />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share a win, a question, or how today's session went..."
              rows={2}
              className="w-full bg-transparent text-chalk placeholder:text-steel focus:outline-none resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="bg-signal text-chalk px-5 py-2 rounded font-body text-sm hover:bg-signal/90 transition-colors disabled:opacity-40"
              >
                {posting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </form>

        {/* Post list */}
        {posts.length === 0 ? (
          <p className="font-body text-steel text-sm">
            No posts yet — be the first to share something with the gym.
          </p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const liked = user ? !!post.likes?.[user.uid] : false;
              const count = likeCount(post);
              const isOpen = !!expandedComments[post.id];

              return (
                <div key={post.id} className="border border-steel/30 rounded-lg p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar name={post.authorName} size={40} />
                    <div className="flex-1">
                      <p className="font-body text-chalk">{post.authorName}</p>
                      <p className="font-mono text-xs text-steel">{timeAgo(post.createdAt)}</p>
                    </div>
                    {post.authorId === user?.uid && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="font-body text-xs text-steel hover:text-signal transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <p className="font-body text-chalk mb-4 whitespace-pre-wrap">{post.text}</p>

                  <div className="tick-divider mb-2" />

                  {/* Like + comment row */}
                  <div className="flex items-center gap-4 py-1">
                    <button
                      onClick={() => handleToggleLike(post)}
                      className="flex items-center gap-2 font-body text-sm transition-transform active:scale-90"
                    >
                      <span className={`text-xl ${liked ? "" : "opacity-50"}`}>
                        {liked ? "❤️" : "🤍"}
                      </span>
                      <span className={liked ? "text-signal" : "text-steel"}>
                        {count > 0 ? count : ""}
                      </span>
                    </button>
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="font-body text-sm text-steel hover:text-chalk transition-colors"
                    >
                      💬 {post.commentCount || 0}
                    </button>
                  </div>

                  {/* Comments */}
                  {isOpen && (
                    <div className="pt-3 border-t border-steel/20 space-y-3">
                      {(comments[post.id] || []).map((c) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <Avatar name={c.authorName} size={28} />
                          <div className="bg-steel/10 rounded-lg px-3 py-2 flex-1">
                            <p className="font-body text-xs text-steel">{c.authorName}</p>
                            <p className="font-body text-sm text-chalk">{c.text}</p>
                          </div>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) =>
                            setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddComment(post.id);
                            }
                          }}
                          placeholder="Write a comment..."
                          className="flex-1 bg-transparent border border-steel/40 rounded px-3 py-2 text-sm text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
                        />
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="font-body text-sm text-signal hover:underline"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
