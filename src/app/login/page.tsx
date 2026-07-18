"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { friendlyAuthError, isValidEmail } from "@/lib/authErrors";
import { signInWithGoogle, signInWithFacebook } from "@/lib/socialAuth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(friendlyAuthError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setSocialLoading("google");
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Couldn't sign in with Google. Please try again.");
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleFacebook = async () => {
    setError("");
    setSocialLoading("facebook");
    try {
      await signInWithFacebook();
      router.push("/dashboard");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setError("Couldn't sign in with Facebook. Please try again.");
      }
    } finally {
      setSocialLoading(null);
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
        <h1 className="font-display text-4xl text-chalk mb-8">LOG IN</h1>

        <div className="flex flex-col gap-3 mb-6">
          <button
            onClick={handleGoogle}
            disabled={socialLoading !== null}
            className="flex items-center justify-center gap-3 border border-steel/40 rounded py-3 font-body text-sm text-chalk hover:border-chalk transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z" />
            </svg>
            {socialLoading === "google" ? "Signing in..." : "Continue with Google"}
          </button>
          <button
            onClick={handleFacebook}
            disabled={socialLoading !== null}
            className="flex items-center justify-center gap-3 bg-[#1877F2] rounded py-3 font-body text-sm text-white hover:bg-[#1877F2]/90 transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
              <path d="M18 9a9 9 0 1 0-10.4 8.89v-6.29H5.31V9h2.29V7.02c0-2.26 1.35-3.51 3.41-3.51.99 0 2.02.18 2.02.18v2.22h-1.14c-1.12 0-1.47.7-1.47 1.41V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9z" />
            </svg>
            {socialLoading === "facebook" ? "Signing in..." : "Continue with Facebook"}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-steel/30" />
          <span className="font-mono text-xs text-steel">OR</span>
          <div className="flex-1 h-px bg-steel/30" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
            placeholder="Password"
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
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="font-body text-steel text-sm mt-6">
          New here?{" "}
          <Link href="/signup" className="text-signal">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
