"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";
import Avatar from "@/components/Avatar";

type PublicProfile = { id: string; name: string };
type ChatSummary = {
  id: string;
  type: "direct" | "group";
  groupName?: string;
  memberIds: string[];
  memberNames: Record<string, string>;
  lastMessage?: string;
  lastMessageAt?: string;
};

export default function ChatList() {
  const router = useRouter();
  const { user, member, loading } = useAuth();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "chats"), where("memberIds", "array-contains", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChatSummary, "id">) }));
      list.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
      setChats(list);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "publicProfiles"), (snap) => {
      setPeople(
        snap.docs
          .map((d) => ({ id: d.id, name: d.data().name as string }))
          .filter((p) => p.id !== user?.uid)
      );
    });
    return () => unsubscribe();
  }, [user]);

  const startDirectChat = async (otherId: string, otherName: string) => {
    if (!user || !member) return;
    const chatId = [user.uid, otherId].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    const existing = await getDoc(chatRef);
    if (!existing.exists()) {
      await setDoc(chatRef, {
        type: "direct",
        memberIds: [user.uid, otherId],
        memberNames: { [user.uid]: member.name, [otherId]: otherName },
        lastMessage: "",
        lastMessageAt: new Date().toISOString(),
      });
    }
    router.push(`/chat/${chatId}`);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const createGroup = async () => {
    if (!user || !member || !groupName.trim() || selectedIds.length === 0) return;
    setCreating(true);
    try {
      const memberIds = [user.uid, ...selectedIds];
      const memberNames: Record<string, string> = { [user.uid]: member.name };
      selectedIds.forEach((id) => {
        const p = people.find((pp) => pp.id === id);
        if (p) memberNames[id] = p.name;
      });

      const newChat = await addDoc(collection(db, "chats"), {
        type: "group",
        groupName: groupName.trim(),
        memberIds,
        memberNames,
        lastMessage: "",
        lastMessageAt: new Date().toISOString(),
      });

      setGroupName("");
      setSelectedIds([]);
      setShowNewGroup(false);
      router.push(`/chat/${newChat.id}`);
    } finally {
      setCreating(false);
    }
  };

  const chatTitle = (chat: ChatSummary) => {
    if (chat.type === "group") return chat.groupName || "Group chat";
    const otherId = chat.memberIds.find((id) => id !== user?.uid);
    return otherId ? chat.memberNames?.[otherId] || "Member" : "Chat";
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

      <div className="px-6 py-8 md:px-12 max-w-3xl">
        <p className="font-mono text-signal text-sm mb-2 tracking-widest">
          MESSAGES
        </p>
        <h1 className="font-display text-5xl text-chalk mb-8">CHAT</h1>

        {chats.length > 0 && (
          <div className="mb-10 space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                className="w-full flex items-center gap-3 border border-steel/30 rounded-lg p-4 hover:border-signal transition-colors text-left"
              >
                <Avatar name={chatTitle(chat)} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-chalk">{chatTitle(chat)}</p>
                  <p className="font-body text-steel text-sm truncate">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="tick-divider mb-6" />

        <div className="mb-8">
          <button
            onClick={() => setShowNewGroup(!showNewGroup)}
            className="font-body text-sm text-signal hover:underline mb-4"
          >
            {showNewGroup ? "Cancel" : "+ New group chat"}
          </button>

          {showNewGroup && (
            <div className="border border-steel/30 rounded-lg p-6">
              <input
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal mb-4"
              />
              <p className="font-body text-steel text-sm mb-2">Add members:</p>
              <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                {people.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 font-body text-chalk text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleSelected(p.id)}
                    />
                    {p.name}
                  </label>
                ))}
              </div>
              <button
                onClick={createGroup}
                disabled={creating || !groupName.trim() || selectedIds.length === 0}
                className="bg-signal text-chalk px-6 py-2 rounded font-body text-sm hover:bg-signal/90 transition-colors disabled:opacity-40"
              >
                {creating ? "Creating..." : "Create group"}
              </button>
            </div>
          )}
        </div>

        <p className="font-body text-steel text-sm mb-4">Start a conversation</p>
        <div className="space-y-2">
          {people.length === 0 ? (
            <p className="font-body text-steel text-sm">No other members yet.</p>
          ) : (
            people.map((p) => (
              <button
                key={p.id}
                onClick={() => startDirectChat(p.id, p.name)}
                className="w-full flex items-center gap-3 border border-steel/30 rounded-lg p-4 hover:border-signal transition-colors text-left"
              >
                <Avatar name={p.name} size={36} />
                <span className="font-body text-chalk">{p.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
