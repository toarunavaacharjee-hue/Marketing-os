import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Careers",
  description: "Careers at AI Marketing Workbench. Help build the operating system for product marketing and GTM teams."
};

const roles = [
  {
    title: "Full-stack Engineer (Next.js / Supabase)",
    location: "Remote (preferred EU/India overlap)",
    level: "Mid–Senior",
    bullets: ["Next.js App Router + TypeScript", "Supabase (Auth/RLS), Stripe", "Performance + DX"]
  },
  {
    title: "Product Marketing Lead (PMM)",
    location: "Remote",
    level: "Senior",
    bullets: ["Positioning + messaging", "Launches + enablement", "Customer research"]
  },
  {
    title: "Design Engineer (UI + motion)",
    location: "Remote",
    level: "Mid–Senior",
    bullets: ["Tailwind + component systems", "Interaction polish", "Accessible UX"]
  }
];

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <header className="mt-10">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Company</div>
          <h1
            className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-text md:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Careers
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
            We’re building the operating system for PMM + GTM teams. If you care about clarity, craft, and shipping—come help.
          </p>
        </header>

        <section className="mt-10 grid gap-4">
          {roles.map((r) => (
            <div key={r.title} className="saas-card saas-card-hover p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xl font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                  {r.title}
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
                  <span className="rounded-full border border-border bg-surface2 px-2.5 py-1">{r.level}</span>
                  <span className="rounded-full border border-border bg-surface2 px-2.5 py-1">{r.location}</span>
                </div>
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text2">
                {r.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-lg bg-[#7c6cff] px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-[#7c6cff]/25 transition hover:bg-[#8b7cff]"
                >
                  Apply via contact
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
                >
                  Learn more
                </Link>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 saas-card p-6">
          <div className="text-sm font-semibold text-text">Don’t see your role?</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">
            Send a short note with what you’d build and why you’re a fit.
          </p>
          <div className="mt-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              Contact us
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

