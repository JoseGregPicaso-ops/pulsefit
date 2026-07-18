"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type Member = {
  name: string;
  email: string;
  role: "member" | "trainer" | "admin";
};

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

      // Accounts signed in via Google/Facebook are trusted by virtue of that
      // provider's own login - only plain email/password accounts need our
      // custom "click the link we emailed you" verification step.
      const isSocialProvider = firebaseUser.providerData.some(
        (p) => p.providerId !== "password"
      );

      if (requireVerified && !firebaseUser.emailVerified && !isSocialProvider) {
        setUser(firebaseUser);
        router.push("/verify-email");
        return;
      }

      setUser(firebaseUser);
      const snap = await getDoc(doc(db, "members", firebaseUser.uid));
      if (snap.exists()) {
        const memberData = snap.data() as Member;
        setMember(memberData);

        setDoc(
          doc(db, "publicProfiles", firebaseUser.uid),
          { name: memberData.name },
          { merge: true }
        ).catch(() => {});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, redirectIfLoggedOut, requireVerified]);

  return { user, member, loading };
}
