import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "About",
  description: "AI Marketing Workbench is the operating system for product marketing and GTM teams shipping weekly."
};

export default function AboutPage() {
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
            About AI Marketing Workbench
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
            We build the PMM + GTM operating layer that connects strategy to execution—so teams can ship weekly loops with
            clarity.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Strategy to execution", "Connect ICP, positioning, messaging, and campaigns so your GTM plan is actionable."],
            ["Workbenches, not dashboards", "Unified work views that show what to do next, not just what happened."],
            ["AI with guardrails", "Generate drafts and workflows while keeping teams aligned on source-of-truth strategy."]
          ].map(([t, d]) => (
            <div key={t} className="saas-card saas-card-hover p-6">
              <div className="text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                {t}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">{d}</p>
            </div>
          ))}
        </section>

        <section className="mt-10 saas-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
            What we believe
          </h2>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text2">
            <li>Weekly operating loops beat quarterly slide decks.</li>
            <li>Positioning is a constraint that makes execution faster.</li>
            <li>Templates should be easy to apply and hard to ignore.</li>
          </ul>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              See pricing
            </Link>
            <Link
              href="/signup?plan=starter"
              className="inline-flex items-center justify-center rounded-lg bg-[#b8ff6c] px-4 py-2 text-[13px] font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 transition hover:bg-[#c8ff7c]"
            >
              Start free
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

