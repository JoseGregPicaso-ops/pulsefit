"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, sendEmailVerification, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Member } from "@/lib/useAuth";
import Avatar from "@/components/Avatar";

export default function Navbar({
  member,
  user,
}: {
  member: Member | null;
  user?: User | null;
}) {
  const router = useRouter();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  const handleResend = async () => {
    if (!user || resending) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      setResent(true);
    } catch (err) {
      // Rate-limited by Firebase if clicked repeatedly - fine to ignore
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-steel/20">
        <Link href="/dashboard" className="font-display text-xl text-chalk">
          AV <span className="text-signal">FITNESS GYM</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className="font-body text-sm text-steel hover:text-chalk transition-colors hidden lg:block"
          >
            Dashboard
          </Link>
          <Link
            href="/classes"
            className="font-body text-sm text-steel hover:text-chalk transition-colors hidden lg:block"
          >
            Classes
          </Link>
          <Link
            href="/plan"
            className="font-body text-sm text-steel hover:text-chalk transition-colors hidden lg:block"
          >
            Plan
          </Link>
          <Link
            href="/coach"
            className="font-body text-sm text-steel hover:text-chalk transition-colors hidden lg:block"
          >
            Coach
          </Link>
          <Link
            href="/feed"
            className="font-body text-sm text-steel hover:text-chalk transition-colors hidden lg:block"
          >
            Feed
          </Link>
          <Link
            href="/chat"
            className="font-body text-sm text-steel hover:text-chalk transition-colors hidden lg:block"
          >
            Chat
          </Link>
          {member?.role === "admin" && (
            <Link
              href="/admin"
              className="font-body text-sm text-signal hover:text-amber transition-colors hidden lg:block"
            >
              Admin
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="font-body text-sm text-steel hover:text-chalk transition-colors hidden lg:block"
          >
            Log out
          </button>
          <button onClick={handleLogout} title="Log out">
            <Avatar name={member?.name || "?"} size={32} />
          </button>
        </div>
      </nav>

      {user && !user.emailVerified && (
        <div className="bg-signal/10 border-b border-signal/30 px-6 py-3 md:px-12 flex flex-wrap items-center justify-between gap-2">
          <p className="font-body text-sm text-chalk">
            ⚠️ Please verify your email ({user.email}) to secure your account.
          </p>
          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="font-body text-sm text-signal hover:underline disabled:opacity-60"
          >
            {resent ? "Verification email sent ✓" : resending ? "Sending..." : "Resend verification email"}
          </button>
        </div>
      )}
    </>
  );
}
