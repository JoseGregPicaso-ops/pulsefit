"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, addDoc, query, orderBy, onSnapshot, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

type WalkIn = {
  id: string;
  name: string;
  category: "Student" | "Regular";
  price: number;
  timestamp: string;
};

const PRICES = { Student: 70, Regular: 90 };

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function WalkIns() {
  const { user, member, loading } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState<"Student" | "Regular" | null>(null);
  const [todayWalkIns, setTodayWalkIns] = useState<WalkIn[]>([]);
  const [justAdded, setJustAdded] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "walkIns"),
      where("timestamp", ">=", startOfToday()),
      orderBy("timestamp", "desc")
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setTodayWalkIns(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WalkIn, "id">) })));
    });
    return () => unsubscribe();
  }, []);

  const handleLogWalkIn = async (category: "Student" | "Regular") => {
    if (!name.trim() || !user || submitting) return;
    setSubmitting(category);
    try {
      await addDoc(collection(db, "walkIns"), {
        name: name.trim(),
        category,
        price: PRICES[category],
        timestamp: new Date().toISOString(),
        recordedBy: user.uid,
      });
      setJustAdded(name.trim());
      setName("");
      setTimeout(() => setJustAdded(""), 2000);
    } finally {
      setSubmitting(null);
    }
  };

  const totalToday = todayWalkIns.reduce((sum, w) => sum + w.price, 0);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-steel">Loading...</p>
      </main>
    );
  }

  if (member?.role !== "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <p className="font-body text-steel text-center">
          This page is for gym admins/staff only.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar member={member} user={user} />

      <div className="px-6 py-8 md:px-12 max-w-2xl mx-auto">
        <Link href="/admin" className="font-body text-steel hover:text-chalk transition-colors text-sm">
          ← Admin
        </Link>
        <p className="font-mono text-amber text-sm mt-4 mb-2 tracking-widest">FRONT DESK</p>
        <h1 className="font-display text-5xl text-chalk mb-8">WALK-IN LOG</h1>

        {/* Quick entry */}
        <div className="border border-steel/30 rounded-lg p-6 mb-8">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="Visitor's name"
            autoFocus
            className="w-full bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk text-lg placeholder:text-steel focus:outline-none focus:border-signal mb-4"
          />
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleLogWalkIn("Student")}
              disabled={!name.trim() || submitting !== null}
              className="bg-amber text-ink font-medium py-4 rounded text-lg hover:bg-amber/90 transition-colors disabled:opacity-40"
            >
              {submitting === "Student" ? "..." : "Student · ₱70"}
            </button>
            <button
              onClick={() => handleLogWalkIn("Regular")}
              disabled={!name.trim() || submitting !== null}
              className="bg-signal text-chalk font-medium py-4 rounded text-lg hover:bg-signal/90 transition-colors disabled:opacity-40"
            >
              {submitting === "Regular" ? "..." : "Regular · ₱90"}
            </button>
          </div>
          {justAdded && (
            <p className="font-body text-sm text-signal mt-3">
              ✓ Logged {justAdded}
            </p>
          )}
        </div>

        {/* Today's summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-body text-steel text-sm">
            {todayWalkIns.length} walk-in{todayWalkIns.length === 1 ? "" : "s"} today
          </p>
          <p className="font-mono text-amber text-lg">₱{totalToday}</p>
        </div>

        <div className="tick-divider mb-4" />

        {/* Today's list */}
        {todayWalkIns.length === 0 ? (
          <p className="font-body text-steel text-sm">No walk-ins logged yet today.</p>
        ) : (
          <div className="space-y-2">
            {todayWalkIns.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between border border-steel/20 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-body text-chalk">{w.name}</p>
                  <p className="font-mono text-xs text-steel">
                    {new Date(w.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {w.category}
                  </p>
                </div>
                <p className="font-mono text-amber">₱{w.price}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
