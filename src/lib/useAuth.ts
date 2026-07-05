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

// Any page that needs to know "who is logged in" can call this one hook
// instead of repeating the same Firebase code everywhere.
export function useAuth(redirectIfLoggedOut = true) {
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

      setUser(firebaseUser);
      const snap = await getDoc(doc(db, "members", firebaseUser.uid));
      if (snap.exists()) {
        setMember(snap.data() as Member);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, redirectIfLoggedOut]);

  return { user, member, loading };
}
