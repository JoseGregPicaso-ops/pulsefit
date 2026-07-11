"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type Member = {
  name: string;
  email: string;
  role: "member" | "trainer" | "admin";
};

// Any page that needs to know "who is logged in" calls this one hook.
//
// requireVerified: when true (the default), a logged-in-but-unverified user
// gets redirected to /verify-email instead of seeing the page at all - this
// is the "hard block" enforcement. The verify-email page itself passes
// `false` here, since it's the one place an unverified user IS allowed to be.
export function useAuth(redirectIfLoggedOut = true, requireVerified = true) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setMember(null);
        setLoading(false);
        if (redirectIfLoggedOut) router.push("/login");
        return;
      }

      if (requireVerified && !firebaseUser.emailVerified) {
        setUser(firebaseUser);
        router.push("/verify-email");
        return; // stays "loading" so the page never flashes its real content
      }

      setUser(firebaseUser);
      const snap = await getDoc(doc(db, "members", firebaseUser.uid));
      if (snap.exists()) {
        setMember(snap.data() as Member);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, redirectIfLoggedOut, requireVerified]);

  return { user, member, loading };
}
