"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const riskColor = (label: string) =>
  label === "High" ? "text-signal" : label === "Medium" ? "text-amber" : "text-steel";

export default function Admin() {
  const { user, member, loading } = useAuth();
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [churnScores, setChurnScores] = useState<ChurnScore[]>([]);

  const [title, setTitle] = useState("");
  const [trainer, setTrainer] = useState("");
  const [day, setDay] = useState(DAYS[0]);
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GymClass, "id">) }))
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) }))
      );
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "churnScores"), orderBy("riskScore", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setChurnScores(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ChurnScore, "id">) }))
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
        <p className="font-mono text-amber text-sm mb-2 tracking-widest">
          ADMIN PANEL
        </p>
        <h1 className="font-display text-5xl text-chalk mb-8">
          MANAGE CLASSES
        </h1>

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
              <option key={d} value={d}>
                {d}
              </option>
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

        <p className="font-mono text-amber text-sm mb-2 tracking-widest">
          006 · DATA-DRIVEN INSIGHTS
        </p>
        <h2 className="font-display text-4xl text-chalk mb-6">
          SMART SCHEDULING
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="border border-steel/30 rounded-lg p-6">
            <h3 className="font-body text-steel text-sm mb-4">
              Bookings by day of week
            </h3>
            {bookings.length === 0 ? (
              <p className="font-body text-steel text-sm">
                No bookings yet — insights will appear once members start booking classes.
              </p>
            ) : (
              <div className="space-y-3">
                {bookingsByDay.map((d) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-steel w-24">
                      {d.day.toUpperCase()}
                    </span>
                    <div className="flex-1 bg-steel/10 rounded h-4 overflow-hidden">
                      <div
                        className="bg-amber h-full rounded"
                        style={{ width: `${(d.count / maxDayCount) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-chalk w-6 text-right">
                      {d.count}
                    </span>
                  </div>
                ))}
                {busiestDay.count > 0 && (
                  <p className="font-body text-sm text-chalk pt-2">
                    💡 <span className="text-amber">{busiestDay.day}</span> is your
                    busiest day — consider scheduling more classes then.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border border-steel/30 rounded-lg p-6">
            <h3 className="font-body text-steel text-sm mb-4">
              Classes filling up (70%+ booked)
            </h3>
            {nearCapacity.length === 0 ? (
              <p className="font-body text-steel text-sm">
                No classes are close to capacity right now.
              </p>
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

        <p className="font-mono text-amber text-sm mb-2 tracking-widest">
          005 · ML-POWERED
        </p>
        <h2 className="font-display text-4xl text-chalk mb-6">
          MEMBER RETENTION RISK
        </h2>

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
                    <td className="font-mono text-steel text-sm px-4 py-3">
                      {s.avgClassesPerWeek}
                    </td>
                    <td className="font-mono text-steel text-sm px-4 py-3">
                      {s.daysSinceLastBooking >= 999
                        ? "Never"
                        : `${s.daysSinceLastBooking}d ago`}
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
