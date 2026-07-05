"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Member } from "@/lib/useAuth";

export default function Navbar({ member }: { member: Member | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/");
  };

  return (
    <nav className="flex items-center justify-between px-6 py-5 md:px-12 border-b border-steel/20">
      <Link href="/dashboard" className="font-display text-2xl text-chalk">
        PULSE<span className="text-signal">FIT</span>
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/dashboard"
          className="font-body text-sm text-steel hover:text-chalk transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/classes"
          className="font-body text-sm text-steel hover:text-chalk transition-colors"
        >
          Classes
        </Link>
        <Link
          href="/plan"
          className="font-body text-sm text-steel hover:text-chalk transition-colors"
        >
          Plan
        </Link>
        <Link
          href="/coach"
          className="font-body text-sm text-steel hover:text-chalk transition-colors"
        >
          Coach
        </Link>
        {/* Only admins see this link */}
        {member?.role === "admin" && (
          <Link
            href="/admin"
            className="font-body text-sm text-amber hover:text-chalk transition-colors"
          >
            Admin
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="font-body text-sm text-steel hover:text-chalk transition-colors"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
