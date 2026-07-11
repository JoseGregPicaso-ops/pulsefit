import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <span className="font-display text-2xl tracking-wide text-chalk">
          AV <span className="text-signal">FITNESS GYM</span>
        </span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="font-body text-sm text-steel hover:text-chalk transition-colors px-4 py-2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="font-body text-sm bg-signal text-chalk px-4 py-2 rounded hover:bg-signal/90 transition-colors"
          >
            Join now
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col justify-center px-6 md:px-12 max-w-5xl">
        <p className="font-mono text-signal text-sm mb-4 tracking-widest">
          GOA, CAMARINES SUR · POWERED BY AI
        </p>
        <h1 className="font-display text-6xl md:text-8xl leading-[0.9] text-chalk mb-6">
          TRAIN SMARTER.
          <br />
          NOT JUST HARDER.
        </h1>
        <p className="font-body text-steel text-lg max-w-xl mb-8">
          Book classes, track every rep, trace your outdoor runs, and let
          your AI coach build a plan that actually adapts to how you train.
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="/signup"
            className="font-body bg-signal text-chalk px-6 py-3 rounded font-medium hover:bg-signal/90 transition-colors"
          >
            Start training
          </Link>
          <span className="font-mono text-steel text-sm">
            No card required
          </span>
        </div>
      </section>

      {/* Stat strip - signature scoreboard element */}
      <div className="tick-divider" />
      <div className="grid grid-cols-3 px-6 md:px-12 py-8 gap-4">
        <div>
          <p className="font-mono text-3xl text-amber">24/7</p>
          <p className="font-body text-steel text-sm">Access</p>
        </div>
        <div>
          <p className="font-mono text-3xl text-amber">1-ON-1</p>
          <p className="font-body text-steel text-sm">AI coaching</p>
        </div>
        <div>
          <p className="font-mono text-3xl text-amber">0</p>
          <p className="font-body text-steel text-sm">Guesswork</p>
        </div>
      </div>
    </main>
  );
}
