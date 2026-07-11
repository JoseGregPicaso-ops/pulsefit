"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

export default function Dashboard() {
  const { user, member, loading } = useAuth();
  const [bookingCount, setBookingCount] = useState(0);
  const [hasPlan, setHasPlan] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "bookings"), where("memberId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snap) => setBookingCount(snap.size));
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkPlan = async () => {
      const snap = await getDoc(doc(db, "plans", user.uid));
      setHasPlan(snap.exists());
    };
    checkPlan();
  }, [user]);

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

      <div className="px-6 py-8 md:px-12">
        <p className="font-mono text-signal text-sm mb-2 tracking-widest">
          WELCOME BACK
        </p>
        <h1 className="font-display text-5xl text-chalk mb-10">
          {member?.name?.toUpperCase() || "MEMBER"}
        </h1>

        <div className="tick-divider mb-8" />

        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/classes"
            className="border border-steel/30 rounded-lg p-6 hover:border-signal transition-colors"
          >
            <p className="font-mono text-amber text-3xl mb-2">
              {bookingCount}
            </p>
            <p className="font-body text-steel text-sm">
              Classes booked — tap to book more
            </p>
          </Link>

          <Link
            href="/plan"
            className="border border-steel/30 rounded-lg p-6 hover:border-signal transition-colors"
          >
            <p className="font-mono text-amber text-3xl mb-2">
              {hasPlan ? "✓" : "—"}
            </p>
            <p className="font-body text-steel text-sm">
              {hasPlan ? "View your AI workout plan" : "Generate your AI workout plan"}
            </p>
          </Link>

          <Link
            href="/coach"
            className="border border-steel/30 rounded-lg p-6 hover:border-signal transition-colors"
          >
            <p className="font-mono text-amber text-3xl mb-2">💬</p>
            <p className="font-body text-steel text-sm">
              Ask your AI coach anything about the gym
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
