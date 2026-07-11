"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

type Message = {
  role: "user" | "coach";
  text: string;
  sources?: { id: string; score: number }[];
};

export default function CoachPage() {
  const { user, member, loading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "coach",
      text: "Hey! I'm your AI coach. Ask me about gym hours, class booking, membership, what to bring on your first visit — anything about AV Fitness Gym.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const question = input.trim();
    const newMessages: Message[] = [...messages, { role: "user", text: question }];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: newMessages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setMessages((prev) => [
        ...prev,
        { role: "coach", text: data.answer, sources: data.sources },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "coach", text: "Sorry, I couldn't respond right now. Please try again." },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-steel">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Navbar member={member} user={user} />

      <div className="px-6 py-8 md:px-12 flex-1 flex flex-col max-w-3xl w-full mx-auto">
        <p className="font-mono text-signal text-sm mb-2 tracking-widest">
          004 · ASK YOUR AI COACH
        </p>
        <h1 className="font-display text-5xl text-chalk mb-8">AI COACH</h1>

        <div className="flex-1 flex flex-col gap-4 mb-4 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                m.role === "user"
                  ? "self-end bg-signal text-chalk"
                  : "self-start border border-steel/30 text-chalk"
              }`}
            >
              <p className="font-body text-sm whitespace-pre-wrap">{m.text}</p>
              {m.sources && m.sources.length > 0 && (
                <p className="font-mono text-xs text-steel/60 mt-2">
                  based on: {m.sources.map((s) => s.id).join(", ")}
                </p>
              )}
            </div>
          ))}
          {sending && (
            <div className="self-start border border-steel/30 rounded-lg px-4 py-3">
              <p className="font-mono text-steel text-sm">Coach is typing...</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about hours, classes, membership..."
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
