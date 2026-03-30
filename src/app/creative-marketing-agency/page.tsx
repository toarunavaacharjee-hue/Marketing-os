import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Creative Marketing Agency | Orah Tech & Marketing",
  description:
    "Full‑funnel creative marketing: brand, content, performance ads, and websites. Strategy-led creative that ships fast and measures what matters.",
  openGraph: {
    title: "Creative Marketing Agency | Orah Tech & Marketing",
    description:
      "Full‑funnel creative marketing: brand, content, performance ads, and websites. Strategy-led creative that ships fast and measures what matters.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Creative Marketing Agency | Orah Tech & Marketing",
    description:
      "Full‑funnel creative marketing: brand, content, performance ads, and websites. Strategy-led creative that ships fast and measures what matters."
  }
};

const SERVICES: Array<{ title: string; desc: string; bullets: string[] }> = [
  {
    title: "Brand & Positioning",
    desc: "Clarity first — so every asset feels like you.",
    bullets: ["ICP + narrative", "Messaging framework", "Brand system + guidelines"]
  },
  {
    title: "Content & Social",
    desc: "Consistent output with a creative POV.",
    bullets: ["Content strategy", "Short-form + carousels", "Thought leadership edits"]
  },
  {
    title: "Performance Creative",
    desc: "Ad creative that learns fast and scales.",
    bullets: ["Meta/LinkedIn creative sets", "Landing page messaging", "Testing matrix + iterations"]
  },
  {
    title: "Websites & Landing Pages",
    desc: "High-converting pages designed for speed.",
    bullets: ["Web copy + UX", "Design in a dark premium style", "Conversion-first sections"]
  }
];

const PROCESS: Array<{ step: string; title: string; desc: string }> = [
  { step: "01", title: "Diagnose", desc: "Audit your offer, funnel, and creative to find the highest-leverage fixes." },
  { step: "02", title: "Concept", desc: "Translate strategy into clear concepts, hooks, and page structures." },
  { step: "03", title: "Produce", desc: "Design + copy + creative variations shipped in tight weekly cycles." },
  { step: "04", title: "Optimize", desc: "Measure, learn, and iterate with a simple testing plan." }
];

export default function CreativeMarketingAgencyPage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]">
      <header className="border-b border-[#2a2e3f] bg-[#08080c]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-7 w-7 rounded-lg bg-[#7c6cff]/25 ring-1 ring-[#7c6cff]/40" />
            Orah Tech & Marketing
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#9090b0] md:flex">
            <Link href="/creative-marketing-agency" className="text-[#f0f0f8]">
              Creative agency
            </Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Login</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#2a2e3f] bg-transparent px-3 py-2 text-sm hover:bg-white/5"
            >
              View demo
            </Link>
            <a
              href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
              className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm font-medium text-black"
            >
              Book a call
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12">
        <section className="grid gap-8 pt-10 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2a2e3f] bg-[#141420] px-3 py-1 text-xs text-[#9090b0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff6c]" />
              Strategy-led creative for founders and growth teams
            </div>
            <h1 className="mt-4 text-5xl leading-tight md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
              Creative marketing that ships fast — and converts.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#9090b0]">
              We build brand systems, content engines, and performance creative that makes your product easier to buy.
              Weekly cycles, clear ROI targets, and high-quality execution.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
                className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black"
              >
                Get a proposal
              </a>
              <Link href="/#features" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                See the workbench
              </Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                ["Turnaround", "Weekly delivery cadence"],
                ["Approach", "Strategy → creative → learn"],
                ["Focus", "Messaging + conversion"]
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
                  <div className="text-xs text-[#9090b0]">{k}</div>
                  <div className="mt-1 text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#2a2e3f] bg-[#141420] p-6">
            <div className="text-sm text-[#f0f0f8]">What we can ship in 14 days</div>
            <div className="mt-4 grid gap-2 text-sm text-[#9090b0]">
              {[
                "A crisp positioning + messaging one-pager",
                "A landing page (copy + design) aligned to your ICP",
                "A performance creative starter set (hooks + variants)",
                "A simple testing plan for the next 30 days"
              ].map((x) => (
                <div key={x} className="rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2">
                  {x}
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
                className="rounded-xl bg-[#7c6cff] px-4 py-2 text-sm font-medium text-white"
              >
                Ask about availability
              </a>
              <Link
                href="/pricing"
                className="rounded-xl border border-[#2a2e3f] px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            Services
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[#9090b0]">
            Pick a lane or run the full stack. We keep scopes clean so output stays consistent and measurable.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {SERVICES.map((s) => (
              <div key={s.title} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg">{s.title}</div>
                    <div className="mt-1 text-sm text-[#9090b0]">{s.desc}</div>
                  </div>
                  <span className="h-9 w-9 rounded-xl bg-[#7c6cff]/15 ring-1 ring-[#7c6cff]/25" />
                </div>
                <ul className="mt-4 space-y-2 text-sm text-[#9090b0]">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#b8ff6c]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-[#2a2e3f] bg-[#141420] p-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                A simple process that compounds.
              </h2>
              <p className="mt-3 text-sm text-[#9090b0]">
                We keep the loop tight: learn what matters, ship quickly, and improve with each iteration.
              </p>
              <div className="mt-6 rounded-2xl border border-[#2a2e3f] bg-black/20 p-5 text-sm text-[#9090b0]">
                <div className="text-[#f0f0f8]">Good for</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {["B2B SaaS & services", "Local + regional brands", "Creators & DTC", "New launches"].map((x) => (
                    <div key={x} className="rounded-xl border border-[#2a2e3f] bg-[#141420]/60 px-3 py-2">
                      {x}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {PROCESS.map((p) => (
                <div key={p.step} className="rounded-2xl border border-[#2a2e3f] bg-black/20 p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-[#c4b8ff]">{p.step}</div>
                    <div className="h-2 w-12 rounded-full bg-[#7c6cff]/30" />
                  </div>
                  <div className="mt-2 text-base text-[#f0f0f8]">{p.title}</div>
                  <div className="mt-1 text-sm text-[#9090b0]">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            Proof (what we optimize for)
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Message clarity", "Sharper ICP framing, fewer vague claims, more “this is for me” moments."],
              ["Conversion lift", "Landing pages + hooks that reduce friction and improve intent."],
              ["Velocity", "A cadence your team can plan around — and a backlog that stays clean."]
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
                <div className="text-base">{t}</div>
                <div className="mt-2 text-sm text-[#9090b0]">{d}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-[#7c6cff]/30 bg-[#141420] p-8 text-center">
          <h3 className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Want a creative plan for your next 30 days?
          </h3>
          <p className="mt-3 mx-auto max-w-2xl text-[#9090b0]">
            Share your offer + target customer. We’ll respond with a recommended scope, timeline, and what we’d ship first.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="mailto:hello@orahtechandmarketing.com?subject=Creative%20Marketing%20Inquiry"
              className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black"
            >
              Email us
            </a>
            <Link href="/" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
              Back to home
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2a2e3f]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
          <div>
            <div className="font-semibold">Orah Tech & Marketing</div>
            <p className="mt-2 text-sm text-[#9090b0]">Creative marketing + execution systems.</p>
          </div>
          <div className="text-sm text-[#9090b0]">
            <div className="mb-2 text-[#f0f0f8]">Services</div>
            <div>Brand & Positioning</div>
            <div>Content & Social</div>
            <div>Performance Creative</div>
            <div>Websites</div>
          </div>
          <div className="text-sm text-[#9090b0]">
            <div className="mb-2 text-[#f0f0f8]">Product</div>
            <Link className="block" href="/#features">
              Workbench
            </Link>
            <Link className="block" href="/pricing">
              Pricing
            </Link>
          </div>
          <div className="text-sm text-[#9090b0]">
            <div className="mb-2 text-[#f0f0f8]">Contact</div>
            <a className="block" href="mailto:hello@orahtechandmarketing.com">
              hello@orahtechandmarketing.com
            </a>
            <Link className="mt-2 inline-flex rounded-xl border border-[#2a2e3f] px-3 py-2 hover:bg-white/5" href="/login">
              Client login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

