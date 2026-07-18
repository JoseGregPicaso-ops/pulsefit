"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";
import Avatar from "@/components/Avatar";

type ChatDoc = {
  type: "direct" | "group";
  groupName?: string;
  memberIds: string[];
  memberNames: Record<string, string>;
};

type Message = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
};

export default function ChatConversation() {
  const params = useParams();
  const chatId = params.chatId as string;
  const router = useRouter();
  const { user, member, loading } = useAuth();

  const [chat, setChat] = useState<ChatDoc | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load the chat doc once, mostly to build the header title and confirm access
  useEffect(() => {
    if (!user) return;
    const loadChat = async () => {
      const snap = await getDoc(doc(db, "chats", chatId));
      if (snap.exists()) {
        const data = snap.data() as ChatDoc;
        if (data.memberIds.includes(user.uid)) {
          setChat(data);
        }
      }
      setCheckingAccess(false);
    };
    loadChat();
  }, [chatId, user]);

  // Live-listen to messages
  useEffect(() => {
    if (!chat) return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("sentAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Message, "id">) })));
    });
    return () => unsubscribe();
  }, [chat, chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !member || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        senderName: member.name,
        text,
        sentAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text,
        lastMessageAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  };

  const title = chat
    ? chat.type === "group"
      ? chat.groupName || "Group chat"
      : chat.memberNames?.[chat.memberIds.find((id) => id !== user?.uid) || ""] || "Chat"
    : "";

  if (loading || checkingAccess) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-steel">Loading...</p>
      </main>
    );
  }

  if (!chat) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="font-body text-steel mb-4">
          This conversation doesn't exist or you don't have access to it.
        </p>
        <button
          onClick={() => router.push("/chat")}
          className="text-signal font-body text-sm hover:underline"
        >
          Back to messages
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar member={member} user={user} />

      <div className="px-6 py-6 md:px-12 flex-1 flex flex-col max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/chat")}
            className="font-body text-steel hover:text-chalk transition-colors"
          >
            ←
          </button>
          <Avatar name={title} size={36} />
          <h1 className="font-display text-3xl text-chalk">{title}</h1>
        </div>

        <div className="flex-1 flex flex-col gap-3 mb-4 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="font-body text-steel text-sm">
              No messages yet — say hello!
            </p>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user?.uid;
              return (
                <div
                  key={m.id}
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    isMe
                      ? "self-end bg-signal text-chalk"
                      : "self-start border border-steel/30 text-chalk"
                  }`}
                >
                  {!isMe && chat.type === "group" && (
                    <p className="font-mono text-xs text-steel mb-1">{m.senderName}</p>
                  )}
                  <p className="font-body text-sm whitespace-pre-wrap">{m.text}</p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-signal text-chalk px-6 py-3 rounded font-medium hover:bg-signal/90 transition-colors disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
