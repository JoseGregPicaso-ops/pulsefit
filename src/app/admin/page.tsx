"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

type GymClass = {
  id: string;
  title: string;
  trainer: string;
  day: string;
  time: string;
  capacity: number;
  bookedCount: number;
};

type Booking = {
  id: string;
  day: string;
  time: string;
  className: string;
};

type ChurnScore = {
  id: string;
  memberName: string;
  riskScore: number;
  riskLabel: "Low" | "Medium" | "High";
  avgClassesPerWeek: number;
  daysSinceLastBooking: number;
  computedAt: string;
};

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  membershipType?: string;
  membershipExpiresAt?: string | null;
  membershipStartedAt?: string | null;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const PLAN_DURATIONS: Record<string, number> = { Monthly: 30, Quarterly: 90, Annual: 365 };

const riskColor = (label: string) =>
  label === "High" ? "text-signal" : label === "Medium" ? "text-amber" : "text-steel";

function membershipStatus(m: MemberRow): { label: string; color: string; daysLeft: number | null } {
  if (!m.membershipType || m.membershipType === "None" || !m.membershipExpiresAt) {
    return { label: "No membership", color: "text-steel", daysLeft: null };
  }
  const daysLeft = Math.ceil(
    (new Date(m.membershipExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft < 0) return { label: "Expired", color: "text-signal", daysLeft };
  if (daysLeft <= 7) return { label: "Expiring soon", color: "text-amber", daysLeft };
  return { label: "Active", color: "text-chalk", daysLeft };
}

export default function Admin() {
  const { user, member, loading } = useAuth();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [churnScores, setChurnScores] = useState<ChurnScore[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Record<string, string>>({});
  const [savingMembership, setSavingMembership] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [trainer, setTrainer] = useState("");
  const [day, setDay] = useState(DAYS[0]);
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GymClass, "id">) })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) })));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "churnScores"), orderBy("riskScore", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setChurnScores(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChurnScore, "id">) })));
    });
    return () => unsubscribe();
  }, []);

  // Full member list - only admins can read this per the Firestore rules
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "members"), (snap) => {
      setMembers(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<MemberRow, "id">) }))
          .filter((m) => m.role !== "admin") // admins don't need "membership" tracking
      );
    });
    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "classes"), {
        title,
        trainer,
        day,
        time,
        capacity: Number(capacity),
        bookedCount: 0,
      });
      setTitle("");
      setTrainer("");
      setTime("");
      setCapacity(10);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Delete this class? This cannot be undone.")) return;
    await deleteDoc(doc(db, "classes", classId));
  };

  // Renewing: extends from whichever is LATER - today, or their current
  // expiration date. So renewing early doesn't waste time they've already
  // paid for, but renewing after it lapsed starts fresh from today.
  const handleRenew = async (memberId: string) => {
    const plan = selectedPlan[memberId] || "Monthly";
    const days = PLAN_DURATIONS[plan];
    const existing = members.find((m) => m.id === memberId);
    const now = Date.now();
    const currentExpiry = existing?.membershipExpiresAt
      ? new Date(existing.membershipExpiresAt).getTime()
      : 0;
    const base = Math.max(now, currentExpiry);
    const newExpiry = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

    setSavingMembership(memberId);
    try {
      await updateDoc(doc(db, "members", memberId), {
        membershipType: plan,
        membershipExpiresAt: newExpiry,
        membershipStartedAt: existing?.membershipStartedAt || new Date().toISOString(),
      });
    } finally {
      setSavingMembership(null);
    }
  };

  const handleCancelMembership = async (memberId: string) => {
    if (!confirm("Cancel this member's active membership?")) return;
    setSavingMembership(memberId);
    try {
      await updateDoc(doc(db, "members", memberId), {
        membershipType: "None",
        membershipExpiresAt: null,
      });
    } finally {
      setSavingMembership(null);
    }
  };

  const bookingsByDay = DAYS.map((d) => ({
    day: d,
    count: bookings.filter((b) => b.day === d).length,
  })).sort((a, b) => b.count - a.count);
  const busiestDay = bookingsByDay[0];
  const maxDayCount = Math.max(...bookingsByDay.map((d) => d.count), 1);

  const nearCapacity = classes
    .map((c) => ({ ...c, utilization: c.capacity ? c.bookedCount / c.capacity : 0 }))
    .filter((c) => c.utilization >= 0.7)
    .sort((a, b) => b.utilization - a.utilization);

  // Sort members: expired/expiring soon first, so admins see who needs
  // attention without hunting for them.
  const sortedMembers = [...members].sort((a, b) => {
    const aStatus = membershipStatus(a);
    const bStatus = membershipStatus(b);
    const order = { Expired: 0, "Expiring soon": 1, Active: 2, "No membership": 3 };
    return (order[aStatus.label as keyof typeof order] ?? 4) -
      (order[bStatus.label as keyof typeof order] ?? 4);
  });

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
          This page is for gym admins only.
          <br />
          Ask an existing admin to update your account role.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar member={member} user={user} />

      <div className="px-6 py-8 md:px-12">
        <p className="font-mono text-amber text-sm mb-2 tracking-widest">ADMIN PANEL</p>
        <h1 className="font-display text-5xl text-chalk mb-8">MANAGE CLASSES</h1>

        <form
          onSubmit={handleCreate}
          className="border border-steel/30 rounded-lg p-6 mb-10 grid md:grid-cols-2 gap-4"
        >
          <input
            required
            placeholder="Class name (e.g. Morning HIIT)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          <input
            required
            placeholder="Trainer name"
            value={trainer}
            onChange={(e) => setTrainer(e.target.value)}
            className="bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="bg-ink border border-steel/40 rounded px-4 py-3 text-chalk focus:outline-none focus:border-signal"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <input
            required
            placeholder="Time (e.g. 6:00 AM)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          <input
            required
            type="number"
            min={1}
            placeholder="Capacity"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-amber text-ink font-medium py-3 rounded hover:bg-amber/90 transition-colors disabled:opacity-50 md:col-span-2"
          >
            {saving ? "Adding..." : "Add class"}
          </button>
        </form>

        <div className="tick-divider mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {classes.map((c) => (
            <div key={c.id} className="border border-steel/30 rounded-lg p-6">
              <p className="font-mono text-steel text-xs tracking-widest mb-1">
                {c.day.toUpperCase()} · {c.time}
              </p>
              <h2 className="font-display text-2xl text-chalk mb-1">{c.title}</h2>
              <p className="font-body text-steel text-sm mb-4">
                with {c.trainer} · {c.bookedCount}/{c.capacity} booked
              </p>
              <button
                onClick={() => handleDelete(c.id)}
                className="text-signal font-body text-sm hover:underline"
              >
                Delete class
              </button>
            </div>
          ))}
        </div>

        {/* Membership expiration tracking */}
        <p className="font-mono text-amber text-sm mb-2 tracking-widest">007 · MEMBERSHIPS</p>
        <h2 className="font-display text-4xl text-chalk mb-6">MEMBERSHIP STATUS</h2>

        {sortedMembers.length === 0 ? (
          <p className="font-body text-steel mb-12">No members yet.</p>
        ) : (
          <div className="border border-steel/30 rounded-lg overflow-hidden mb-12">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-steel/30">
                  <th className="font-mono text-steel text-xs px-4 py-3">MEMBER</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">PLAN</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">STATUS</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">EXPIRES</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">RENEW</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((m) => {
                  const status = membershipStatus(m);
                  return (
                    <tr key={m.id} className="border-b border-steel/10 last:border-0">
                      <td className="font-body text-chalk px-4 py-3">{m.name}</td>
                      <td className="font-mono text-steel text-sm px-4 py-3">
                        {m.membershipType || "None"}
                      </td>
                      <td className={`font-mono text-sm px-4 py-3 ${status.color}`}>
                        {status.label}
                        {status.daysLeft !== null && status.daysLeft >= 0 && (
                          <span className="text-steel"> ({status.daysLeft}d)</span>
                        )}
                      </td>
                      <td className="font-mono text-steel text-sm px-4 py-3">
                        {m.membershipExpiresAt
                          ? new Date(m.membershipExpiresAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedPlan[m.id] || "Monthly"}
                            onChange={(e) =>
                              setSelectedPlan((prev) => ({ ...prev, [m.id]: e.target.value }))
                            }
                            className="bg-ink border border-steel/40 rounded px-2 py-1 text-chalk text-sm focus:outline-none focus:border-signal"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Annual">Annual</option>
                          </select>
                          <button
                            onClick={() => handleRenew(m.id)}
                            disabled={savingMembership === m.id}
                            className="bg-signal text-chalk text-sm px-3 py-1 rounded hover:bg-signal/90 transition-colors disabled:opacity-50"
                          >
                            {savingMembership === m.id ? "..." : "Renew"}
                          </button>
                          {status.label !== "No membership" && (
                            <button
                              onClick={() => handleCancelMembership(m.id)}
                              disabled={savingMembership === m.id}
                              className="font-body text-xs text-steel hover:text-signal transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Smart Scheduling */}
        <p className="font-mono text-amber text-sm mb-2 tracking-widest">006 · DATA-DRIVEN INSIGHTS</p>
        <h2 className="font-display text-4xl text-chalk mb-6">SMART SCHEDULING</h2>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="border border-steel/30 rounded-lg p-6">
            <h3 className="font-body text-steel text-sm mb-4">Bookings by day of week</h3>
            {bookings.length === 0 ? (
              <p className="font-body text-steel text-sm">
                No bookings yet — insights will appear once members start booking classes.
              </p>
            ) : (
              <div className="space-y-3">
                {bookingsByDay.map((d) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-steel w-24">{d.day.toUpperCase()}</span>
                    <div className="flex-1 bg-steel/10 rounded h-4 overflow-hidden">
                      <div
                        className="bg-amber h-full rounded"
                        style={{ width: `${(d.count / maxDayCount) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-chalk w-6 text-right">{d.count}</span>
                  </div>
                ))}
                {busiestDay.count > 0 && (
                  <p className="font-body text-sm text-chalk pt-2">
                    💡 <span className="text-amber">{busiestDay.day}</span> is your busiest day —
                    consider scheduling more classes then.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border border-steel/30 rounded-lg p-6">
            <h3 className="font-body text-steel text-sm mb-4">Classes filling up (70%+ booked)</h3>
            {nearCapacity.length === 0 ? (
              <p className="font-body text-steel text-sm">No classes are close to capacity right now.</p>
            ) : (
              <div className="space-y-4">
                {nearCapacity.map((c) => (
                  <div key={c.id}>
                    <div className="flex justify-between mb-1">
                      <span className="font-body text-sm text-chalk">{c.title}</span>
                      <span className="font-mono text-xs text-signal">
                        {Math.round(c.utilization * 100)}% full
                      </span>
                    </div>
                    <div className="bg-steel/10 rounded h-2 overflow-hidden">
                      <div
                        className="bg-signal h-full rounded"
                        style={{ width: `${c.utilization * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                <p className="font-body text-sm text-chalk pt-2">
                  💡 Consider adding a second session for these classes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Churn risk */}
        <p className="font-mono text-amber text-sm mb-2 tracking-widest">005 · ML-POWERED</p>
        <h2 className="font-display text-4xl text-chalk mb-6">MEMBER RETENTION RISK</h2>

        {churnScores.length === 0 ? (
          <p className="font-body text-steel">
            No churn scores yet. Run <code className="text-amber">python train_and_predict.py</code> from
            the <code className="text-amber">ml</code> folder to generate them.
          </p>
        ) : (
          <div className="border border-steel/30 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-steel/30">
                  <th className="font-mono text-steel text-xs px-4 py-3">MEMBER</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">RISK</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">SCORE</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">CLASSES/WK</th>
                  <th className="font-mono text-steel text-xs px-4 py-3">LAST BOOKED</th>
                </tr>
              </thead>
              <tbody>
                {churnScores.map((s) => (
                  <tr key={s.id} className="border-b border-steel/10 last:border-0">
                    <td className="font-body text-chalk px-4 py-3">{s.memberName}</td>
                    <td className={`font-mono text-sm px-4 py-3 ${riskColor(s.riskLabel)}`}>
                      {s.riskLabel}
                    </td>
                    <td className="font-mono text-steel text-sm px-4 py-3">
                      {(s.riskScore * 100).toFixed(0)}%
                    </td>
                    <td className="font-mono text-steel text-sm px-4 py-3">{s.avgClassesPerWeek}</td>
                    <td className="font-mono text-steel text-sm px-4 py-3">
                      {s.daysSinceLastBooking >= 999 ? "Never" : `${s.daysSinceLastBooking}d ago`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
