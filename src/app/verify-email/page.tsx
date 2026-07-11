"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { sendEmailVerification, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";

export default function VerifyEmail() {
  const router = useRouter();
  // requireVerified=false: this is the one page an unverified user is allowed
  // to stay on, so we don't want the hook redirecting them away from it.
  const { user, loading } = useAuth(true, false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  // If they're already verified (e.g. clicked the link, came back here by
  // mistake, or this page loaded stale), just send them on to the dashboard.
  useEffect(() => {
    if (!loading && user?.emailVerified) {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  const handleResend = async () => {
    if (!user || resending) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      setResent(true);
    } catch (err) {
      // Rate-limited by Firebase if clicked too often - fine to ignore
    } finally {
      setResending(false);
    }
  };

  // Firebase doesn't push verification status to us in real time - the user
  // has to come back and ask us to check. This reloads their auth token,
  // which picks up the latest emailVerified status from Firebase's servers.
  const handleCheckVerified = async () => {
    setChecking(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        router.push("/dashboard");
      } else {
        setChecking(false);
      }
    } catch {
      setChecking(false);
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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-signal text-sm mb-4 tracking-widest">
        ALMOST THERE
      </p>
      <h1 className="font-display text-5xl text-chalk mb-4">
        CHECK YOUR EMAIL
      </h1>
      <p className="font-body text-steel mb-8 max-w-md">
        We sent a confirmation link to <span className="text-chalk">{user?.email}</span>.
        Click it, then come back here and continue.
      </p>

      <div className="flex flex-col gap-4 items-center">
        <button
          onClick={handleCheckVerified}
          disabled={checking}
          className="bg-signal text-chalk px-6 py-3 rounded font-medium hover:bg-signal/90 transition-colors disabled:opacity-50"
        >
          {checking ? "Checking..." : "I've verified my email"}
        </button>
        <button
          onClick={handleResend}
          disabled={resending || resent}
          className="font-body text-sm text-steel hover:text-chalk transition-colors disabled:opacity-60"
        >
          {resent ? "Email sent again ✓" : resending ? "Sending..." : "Didn't get it? Resend email"}
        </button>
      </div>

      <p className="font-body text-steel text-sm mt-10">
        Wrong email?{" "}
        <Link href="/signup" className="text-signal">
          Sign up again
        </Link>
      </p>
    </main>
  );
}
