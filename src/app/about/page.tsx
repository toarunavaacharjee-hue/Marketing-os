import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Orah Tech & Marketing",
  description: "Strategy-led creative marketing with a weekly shipping cadence."
};

export default function AboutPage() {
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
            <Link href="/work">Work</Link>
            <Link href="/about" className="text-[#f0f0f8]">
              About
            </Link>
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
          About
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#9090b0]">
          We’re a creative marketing agency focused on clarity, conversion, and consistent output — not fluff. Strategy
          comes first, then we ship creative in weekly cycles so results compound.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Strategy-led", "We start from ICP, offers, and message — then craft creative that matches intent."],
            ["Weekly cadence", "Short cycles mean faster learning, better iteration, and fewer “big bang” launches."],
            ["Conversion focus", "Design and copy decisions are made to reduce friction and improve intent."]
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
              <div className="text-base">{t}</div>
              <div className="mt-2 text-sm text-[#9090b0]">{d}</div>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-[#7c6cff]/30 bg-[#141420] p-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                If you want premium creative with a clear system, we’ll fit.
              </div>
              <div className="mt-3 text-sm text-[#9090b0]">
                Tell us what you’re selling and who it’s for. We’ll reply with the scope we recommend for the first sprint.
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/services" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                Services
              </Link>
              <Link href="/contact" className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black">
                Contact
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

