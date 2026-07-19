"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot } from "firebase/firestore";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

// Brand colors as plain hex values - Recharts renders raw SVG, so it needs
// actual color values here rather than Tailwind class names.
const COLORS = {
  signal: "#FF6F00",
  amber: "#FF8F33",
  steel: "#9CA3AF",
  chalk: "#FFFFFF",
  grid: "#2A2A2A",
};
const PIE_COLORS = [COLORS.signal, COLORS.amber, "#B45309", COLORS.steel];

type MemberRow = {
  id: string;
  role: string;
  createdAt?: string;
  membershipType?: string;
};
type GymClass = { id: string; title: string; bookedCount: number };
type Booking = { id: string; memberId: string };
type WalkIn = { id: string; timestamp: string; price: number };

// A small dark tooltip that matches the app's theme instead of Recharts'
// default white tooltip box
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ink border border-steel/40 rounded px-3 py-2">
      <p className="font-mono text-xs text-steel mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-mono text-xs text-chalk">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { user, member, loading } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);

  useEffect(() => {
    const unsubMembers = onSnapshot(collection(db, "members"), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MemberRow, "id">) })));
    });
    const unsubClasses = onSnapshot(collection(db, "classes"), (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GymClass, "id">) })));
    });
    const unsubBookings = onSnapshot(collection(db, "bookings"), (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, "id">) })));
    });
    const unsubWalkIns = onSnapshot(collection(db, "walkIns"), (snap) => {
      setWalkIns(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WalkIn, "id">) })));
    });
    return () => {
      unsubMembers();
      unsubClasses();
      unsubBookings();
      unsubWalkIns();
    };
  }, []);

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
        </p>
      </main>
    );
  }

  const realMembers = members.filter((m) => m.role !== "admin");

  // --- LINE CHART: cumulative member growth over the last 8 weeks ---
  const now = new Date();
  const weekBuckets: { label: string; count: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const cumulative = realMembers.filter(
      (m) => m.createdAt && new Date(m.createdAt) <= weekStart
    ).length;
    weekBuckets.push({
      label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: cumulative,
    });
  }

  // --- BAR CHART: class popularity by total bookings ---
  const classPopularity = [...classes]
    .sort((a, b) => b.bookedCount - a.bookedCount)
    .map((c) => ({ name: c.title, bookings: c.bookedCount }));

  // --- HISTOGRAM: distribution of how many classes each member has booked ---
  const bookingCountByMember: Record<string, number> = {};
  bookings.forEach((b) => {
    bookingCountByMember[b.memberId] = (bookingCountByMember[b.memberId] || 0) + 1;
  });
  const bucketLabels = ["0", "1-2", "3-5", "6-10", "10+"];
  const bucketCounts = [0, 0, 0, 0, 0];
  realMembers.forEach((m) => {
    const n = bookingCountByMember[m.id] || 0;
    if (n === 0) bucketCounts[0]++;
    else if (n <= 2) bucketCounts[1]++;
    else if (n <= 5) bucketCounts[2]++;
    else if (n <= 10) bucketCounts[3]++;
    else bucketCounts[4]++;
  });
  const histogramData = bucketLabels.map((label, i) => ({
    label,
    members: bucketCounts[i],
  }));

  // --- PIE CHART: membership plan breakdown ---
  const planCounts: Record<string, number> = { Monthly: 0, Quarterly: 0, Annual: 0, None: 0 };
  realMembers.forEach((m) => {
    const plan = m.membershipType && planCounts[m.membershipType] !== undefined ? m.membershipType : "None";
    planCounts[plan]++;
  });
  const pieData = Object.entries(planCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }));

  // --- LINE CHART 2: daily walk-ins for the last 14 days ---
  const dayBuckets: { label: string; count: number; revenue: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayWalkIns = walkIns.filter((w) => {
      const t = new Date(w.timestamp);
      return t >= dayStart && t < dayEnd;
    });

    dayBuckets.push({
      label: dayStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: dayWalkIns.length,
      revenue: dayWalkIns.reduce((sum, w) => sum + w.price, 0),
    });
  }

  return (
    <main className="min-h-screen">
      <Navbar member={member} user={user} />

      <div className="px-6 py-8 md:px-12">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/admin" className="font-body text-steel hover:text-chalk transition-colors">
            ← Admin
          </Link>
        </div>
        <p className="font-mono text-amber text-sm mb-2 tracking-widest">008 · ANALYTICS</p>
        <h1 className="font-display text-5xl text-chalk mb-10">GYM ANALYTICS</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Line chart */}
          <div className="border border-steel/30 rounded-lg p-6">
            <h2 className="font-body text-chalk mb-1">Member Growth</h2>
            <p className="font-mono text-xs text-steel mb-4">Cumulative signups, last 8 weeks</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={weekBuckets}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={COLORS.steel} tick={{ fontSize: 11 }} />
                <YAxis stroke={COLORS.steel} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Members"
                  stroke={COLORS.signal}
                  strokeWidth={2}
                  dot={{ fill: COLORS.signal, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bar chart */}
          <div className="border border-steel/30 rounded-lg p-6">
            <h2 className="font-body text-chalk mb-1">Class Popularity</h2>
            <p className="font-mono text-xs text-steel mb-4">Total bookings per class</p>
            {classPopularity.length === 0 ? (
              <p className="font-body text-steel text-sm">No classes yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={classPopularity}>
                  <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke={COLORS.steel}
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis stroke={COLORS.steel} tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="bookings" name="Bookings" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Histogram */}
          <div className="border border-steel/30 rounded-lg p-6">
            <h2 className="font-body text-chalk mb-1">Engagement Distribution</h2>
            <p className="font-mono text-xs text-steel mb-4">
              Histogram — members grouped by classes booked
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={histogramData}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={COLORS.steel} tick={{ fontSize: 11 }} />
                <YAxis stroke={COLORS.steel} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="members" name="Members" fill={COLORS.signal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="border border-steel/30 rounded-lg p-6">
            <h2 className="font-body text-chalk mb-1">Membership Plan Breakdown</h2>
            <p className="font-mono text-xs text-steel mb-4">Active plan types across all members</p>
            {pieData.length === 0 ? (
              <p className="font-body text-steel text-sm">No members yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    labelLine={{ stroke: COLORS.steel }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Walk-in trend line chart */}
          <div className="border border-steel/30 rounded-lg p-6 lg:col-span-2">
            <h2 className="font-body text-chalk mb-1">Daily Walk-Ins</h2>
            <p className="font-mono text-xs text-steel mb-4">
              Front-desk walk-ins per day, last 14 days — today vs. previous days
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={dayBuckets}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke={COLORS.steel} tick={{ fontSize: 11 }} />
                <YAxis stroke={COLORS.steel} tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<DarkTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Walk-ins"
                  stroke={COLORS.amber}
                  strokeWidth={2}
                  dot={{ fill: COLORS.amber, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="font-mono text-xs text-steel mt-2">
              Total revenue from walk-ins (14 days): ₱
              {dayBuckets.reduce((sum, d) => sum + d.revenue, 0)}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
