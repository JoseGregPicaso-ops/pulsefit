"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import Navbar from "@/components/Navbar";

type Exercise = { name: string; sets: number; reps: string; notes: string };
type PlanDay = { day: string; focus: string; exercises: Exercise[] };
type Plan = { summary: string; days: PlanDay[]; nutritionTips: string[] };

export default function PlanPage() {
  const { user, member, loading } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [checkingSaved, setCheckingSaved] = useState(true);

  const [goal, setGoal] = useState("Build muscle");
  const [experience, setExperience] = useState("Beginner");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [equipment, setEquipment] = useState("Full gym access");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user) return;
    const loadSaved = async () => {
      const snap = await getDoc(doc(db, "plans", user.uid));
      if (snap.exists()) {
        setPlan(snap.data().plan as Plan);
      }
      setCheckingSaved(false);
    };
    loadSaved();
  }, [user]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, experience, daysPerWeek, equipment, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate plan");
      setPlan(data.plan);

      if (user) {
        await setDoc(doc(db, "plans", user.uid), {
          plan: data.plan,
          goal,
          experience,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading || checkingSaved) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-steel">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar member={member} user={user} />

      <div className="px-6 py-8 md:px-12 max-w-4xl">
        <p className="font-mono text-signal text-sm mb-2 tracking-widest">
          003 · YOUR AI COACH
        </p>
        <h1 className="font-display text-5xl text-chalk mb-8">
          WORKOUT PLAN
        </h1>

        <form
          onSubmit={handleGenerate}
          className="border border-steel/30 rounded-lg p-6 mb-10 grid md:grid-cols-2 gap-4"
        >
          <div>
            <label className="font-body text-steel text-sm block mb-2">
              Primary goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-ink border border-steel/40 rounded px-4 py-3 text-chalk focus:outline-none focus:border-signal"
            >
              <option>Build muscle</option>
              <option>Lose fat</option>
              <option>Improve endurance</option>
              <option>General fitness</option>
              <option>Increase strength</option>
            </select>
          </div>

          <div>
            <label className="font-body text-steel text-sm block mb-2">
              Experience level
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full bg-ink border border-steel/40 rounded px-4 py-3 text-chalk focus:outline-none focus:border-signal"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>

          <div>
            <label className="font-body text-steel text-sm block mb-2">
              Days per week
            </label>
            <select
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="w-full bg-ink border border-steel/40 rounded px-4 py-3 text-chalk focus:outline-none focus:border-signal"
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-body text-steel text-sm block mb-2">
              Equipment available
            </label>
            <select
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              className="w-full bg-ink border border-steel/40 rounded px-4 py-3 text-chalk focus:outline-none focus:border-signal"
            >
              <option>Full gym access</option>
              <option>Dumbbells only</option>
              <option>Bodyweight only</option>
              <option>Home gym (basic equipment)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="font-body text-steel text-sm block mb-2">
              Anything else your coach should know? (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. bad knees, prefer short workouts, training for a specific event..."
              rows={3}
              className="w-full bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
            />
          </div>

          {error && (
            <p className="text-signal text-sm md:col-span-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={generating}
            className="bg-signal text-chalk font-medium py-3 rounded hover:bg-signal/90 transition-colors disabled:opacity-50 md:col-span-2"
          >
            {generating ? "Your coach is thinking..." : plan ? "Regenerate plan" : "Generate my plan"}
          </button>
        </form>

        {plan && (
          <div>
            <div className="tick-divider mb-6" />
            <p className="font-body text-chalk mb-8">{plan.summary}</p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {plan.days.map((d, i) => (
                <div
                  key={i}
                  className="border border-steel/30 rounded-lg p-6"
                >
                  <p className="font-mono text-signal text-xs tracking-widest mb-1">
                    {d.day.toUpperCase()}
                  </p>
                  <h3 className="font-display text-2xl text-chalk mb-3">
                    {d.focus}
                  </h3>
                  <ul className="space-y-2">
                    {d.exercises.map((ex, j) => (
                      <li key={j} className="font-body text-sm text-steel">
                        <span className="text-chalk">{ex.name}</span>
                        {" — "}
                        <span className="font-mono text-amber">
                          {ex.sets} × {ex.reps}
                        </span>
                        {ex.notes && (
                          <span className="block text-xs text-steel/70">
                            {ex.notes}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="border border-amber/30 rounded-lg p-6">
              <h3 className="font-display text-2xl text-amber mb-3">
                NUTRITION TIPS
              </h3>
              <ul className="space-y-2">
                {plan.nutritionTips.map((tip, i) => (
                  <li key={i} className="font-body text-sm text-chalk">
                    · {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
