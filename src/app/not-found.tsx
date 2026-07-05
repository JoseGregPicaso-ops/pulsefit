import Link from "next/link";

// Next.js automatically shows this page whenever a URL doesn't match any
// route in the app - having a branded one instead of the generic default
// is a small thing that makes the whole app feel finished.
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-signal text-sm mb-4 tracking-widest">
        404 · LOST YOUR SPOT
      </p>
      <h1 className="font-display text-7xl text-chalk mb-4">
        SET, NOT FOUND
      </h1>
      <p className="font-body text-steel mb-8 max-w-md">
        The page you're looking for doesn't exist. Let's get you back on track.
      </p>
      <Link
        href="/dashboard"
        className="bg-signal text-chalk px-6 py-3 rounded font-medium hover:bg-signal/90 transition-colors"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
