import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Work | Orah Tech & Marketing",
  description: "Selected creative outcomes: positioning, landing pages, content systems, and performance creative."
};

const CASES = [
  {
    title: "Landing page rebuild for clarity",
    outcome: "Sharper message, cleaner structure, better intent capture.",
    bullets: ["Offer refinement", "New section architecture", "CTA + friction reduction"]
  },
  {
    title: "Content system for consistent weekly shipping",
    outcome: "A repeatable process for short-form + graphics that stays on-brand.",
    bullets: ["Pillars + hooks", "Templates + review loop", "Posting cadence"]
  },
  {
    title: "Performance creative starter set",
    outcome: "Angles + variants designed to learn fast and iterate weekly.",
    bullets: ["Angle library", "Creative variants", "Testing plan"]
  }
] as const;

export default function WorkPage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]">
      <header className="border-b border-[#2a2e3f] bg-[#08080c]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-7 w-7 rounded-lg bg-[#7c6cff]/25 ring-1 ring-[#7c6cff]/40" />
            Orah Tech & Marketing
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#9090b0] md:flex">
            <Link href="/services">Services</Link>
            <Link href="/work" className="text-[#f0f0f8]">
              Work
            </Link>
            <Link href="/about">About</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <Link href="/contact" className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm font-medium text-black">
            Get a proposal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12">
        <h1 className="text-5xl leading-tight md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
          Work
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#9090b0]">
          A few examples of the types of outcomes we deliver. If you want to see a scope aligned to your business, we’ll
          propose a first sprint.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {CASES.map((c) => (
            <div key={c.title} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
              <div className="text-base">{c.title}</div>
              <div className="mt-2 text-sm text-[#9090b0]">{c.outcome}</div>
              <ul className="mt-4 space-y-2 text-sm text-[#9090b0]">
                {c.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#b8ff6c]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-[#7c6cff]/30 bg-[#141420] p-8 text-center">
          <div className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            Want something similar for your funnel?
          </div>
          <div className="mt-3 text-sm text-[#9090b0]">
            Tell us your offer + audience. We’ll reply with a recommended scope and timeline.
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/services" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
              View services
            </Link>
            <Link href="/contact" className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black">
              Contact
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

