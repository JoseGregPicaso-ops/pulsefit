"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

type MembershipInfo = {
  membershipType?: string;
  membershipExpiresAt?: string | null;
};

function membershipStatus(m: MembershipInfo) {
  if (!m.membershipType || m.membershipType === "None" || !m.membershipExpiresAt) {
    return { label: "No active membership", color: "text-steel", daysLeft: null as number | null };
  }
  const daysLeft = Math.ceil(
    (new Date(m.membershipExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft < 0) return { label: "Expired", color: "text-signal", daysLeft };
  if (daysLeft <= 7) return { label: "Expiring soon", color: "text-amber", daysLeft };
  return { label: "Active", color: "text-chalk", daysLeft };
}

export default function Dashboard() {
  const { user, member, loading } = useAuth();
  const [bookingCount, setBookingCount] = useState(0);
  const [hasPlan, setHasPlan] = useState(false);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);

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

  // Live-listen to the member's own doc so membership status updates
  // instantly if an admin renews it while they're on this page
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "members", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMembership({
          membershipType: data.membershipType,
          membershipExpiresAt: data.membershipExpiresAt,
        });
      }
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-steel">Loading...</p>
      </main>
    );
  }

  const status = membership ? membershipStatus(membership) : null;

  return (
    <main className="min-h-screen">
      <Navbar member={member} user={user} />

      <div className="px-6 py-8 md:px-12">
        <p className="font-mono text-signal text-sm mb-2 tracking-widest">
          WELCOME BACK
        </p>
        <h1 className="font-display text-5xl text-chalk mb-6">
          {member?.name?.toUpperCase() || "MEMBER"}
        </h1>

        {/* Membership status banner */}
        {status && member?.role !== "admin" && (
          <div className="border border-steel/30 rounded-lg px-5 py-4 mb-8 flex items-center justify-between flex-wrap gap-2">
            <p className="font-body text-sm text-steel">
              Membership: <span className={`font-medium ${status.color}`}>{status.label}</span>
              {status.daysLeft !== null && status.daysLeft >= 0 && (
                <span className="text-steel"> · {status.daysLeft} day{status.daysLeft === 1 ? "" : "s"} left</span>
              )}
            </p>
            {(status.label === "No active membership" || status.label === "Expired") && (
              <p className="font-body text-xs text-steel">Visit the front desk to activate or renew.</p>
            )}
          </div>
        )}

        <div className="tick-divider mb-8" />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          <Link
            href="/feed"
            className="border border-steel/30 rounded-lg p-6 hover:border-signal transition-colors"
          >
            <p className="font-mono text-amber text-3xl mb-2">📣</p>
            <p className="font-body text-steel text-sm">
              See what the gym community is posting
            </p>
          </Link>

          <Link
            href="/chat"
            className="border border-steel/30 rounded-lg p-6 hover:border-signal transition-colors"
          >
            <p className="font-mono text-amber text-3xl mb-2">👥</p>
            <p className="font-body text-steel text-sm">
              Message other members
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
