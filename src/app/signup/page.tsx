"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { friendlyAuthError, isValidEmail } from "@/lib/authErrors";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

      await setDoc(doc(db, "members", cred.user.uid), {
        name,
        email: email.trim(),
        role: "member",
        createdAt: new Date().toISOString(),
      });

      // Send a confirmation link to their real inbox - this is the only
      // reliable way to confirm an email address is real and belongs to
      // them (format checks alone can't catch typos like "gmail.comm").
      await sendEmailVerification(cred.user);

      router.push("/verify-email");
    } catch (err: any) {
      setError(friendlyAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-2xl text-chalk mb-2 block">
          AV <span className="text-signal">FITNESS GYM</span>
        </Link>
        <p className="font-mono text-steel text-xs mb-8 tracking-widest">
          GOA, CAMARINES SUR
        </p>
        <h1 className="font-display text-4xl text-chalk mb-8">JOIN NOW</h1>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-transparent border border-steel/40 rounded px-4 py-3 text-chalk placeholder:text-steel focus:outline-none focus:border-signal"
          />
          {error && <p className="text-signal text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-signal text-chalk py-3 rounded font-medium hover:bg-signal/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="font-body text-steel text-sm mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-signal">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
