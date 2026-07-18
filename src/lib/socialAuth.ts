import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

// Social sign-in skips our normal signup form, so the first time someone
// logs in this way, we need to create their member profile ourselves -
// using whatever name/email the provider (Google/Facebook) gave us.
async function ensureMemberProfile(user: User) {
  const memberRef = doc(db, "members", user.uid);
  const snap = await getDoc(memberRef);

  if (!snap.exists()) {
    const name = user.displayName || "Member";
    await setDoc(memberRef, {
      name,
      email: user.email || "",
      role: "member",
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, "publicProfiles", user.uid), { name });
  }
}

export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await ensureMemberProfile(result.user);
  return result.user;
}

export async function signInWithFacebook(): Promise<User> {
  const provider = new FacebookAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await ensureMemberProfile(result.user);
  return result.user;
}
