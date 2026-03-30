import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services | Orah Tech & Marketing",
  description: "Brand, content, performance creative, and websites — delivered in a weekly cadence with clear scope."
};

const SERVICES = [
  {
    title: "Brand & Positioning",
    desc: "Make it instantly clear who you help and why you win.",
    deliverables: ["ICP snapshot", "Positioning + messaging", "Offer refinement", "Brand guidelines (light)"]
  },
  {
    title: "Content & Social",
    desc: "A content engine that looks premium and stays consistent.",
    deliverables: ["Content pillars + calendar", "Short-form edits", "Carousels + graphics", "Posting cadence + review loop"]
  },
  {
    title: "Performance Creative",
    desc: "Creative systems that learn fast across Meta + LinkedIn.",
    deliverables: ["Hook/angle library", "Creative variants", "Landing page alignment", "Iteration plan"]
  },
  {
    title: "Websites & Landing Pages",
    desc: "Conversion-first pages designed for speed and clarity.",
    deliverables: ["Page strategy + structure", "Web copy", "Design direction", "Build support coordination"]
  }
] as const;

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]">
      <header className="border-b border-[#2a2e3f] bg-[#08080c]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-7 w-7 rounded-lg bg-[#7c6cff]/25 ring-1 ring-[#7c6cff]/40" />
            Orah Tech & Marketing
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#9090b0] md:flex">
            <Link href="/services" className="text-[#f0f0f8]">
              Services
            </Link>
            <Link href="/work">Work</Link>
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
          Services that keep output consistent.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-[#9090b0]">
          Clear scope, weekly cadence, and creative that’s aligned to your funnel. Start with one lane or bundle a full
          sprint.
        </p>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
              <div className="text-lg">{s.title}</div>
              <div className="mt-2 text-sm text-[#9090b0]">{s.desc}</div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-[#c4b8ff]">Typical deliverables</div>
              <ul className="mt-3 space-y-2 text-sm text-[#9090b0]">
                {s.deliverables.map((d) => (
                  <li key={d} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#b8ff6c]" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-3xl border border-[#7c6cff]/30 bg-[#141420] p-8">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="text-sm text-[#9090b0]">Best next step</div>
              <div className="mt-2 text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                Tell us what you’re selling and who it’s for.
              </div>
              <div className="mt-3 text-sm text-[#9090b0]">
                We’ll respond with a recommended scope for the first 2 weeks and what we’d ship first.
              </div>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/pricing" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                View packages
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

