import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact AI Marketing Workbench for support, partnerships, or questions."
};

export default function ContactPage() {
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
            Contact
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
            Have a question, want a demo, or need help? Reach out—we’ll respond as quickly as possible.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="saas-card saas-card-hover p-6">
            <div className="text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
              Email
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text2">
              For sales, partnerships, support, and general questions.
            </p>
            <div className="mt-4">
              <a
                href="mailto:support@aimarketingworkbench.com"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
              >
                support@aimarketingworkbench.com
              </a>
            </div>
          </div>
          <div className="saas-card saas-card-hover p-6">
            <div className="text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
              Support
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text2">Customer support inbox.</p>
            <div className="mt-4">
              <a
                href="mailto:support@aimarketingworkbench.com"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
              >
                support@aimarketingworkbench.com
              </a>
            </div>
          </div>
          <div className="saas-card saas-card-hover p-6">
            <div className="text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
              Demo
            </div>
            <p className="mt-2 text-sm leading-relaxed text-text2">Prefer to explore first? Start free or view the demo.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/signup?plan=starter"
                className="inline-flex items-center justify-center rounded-lg bg-[#b8ff6c] px-4 py-2 text-[13px] font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 transition hover:bg-[#c8ff7c]"
              >
                Start free
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
              >
                View demo
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 saas-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
            Quick notes
          </h2>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text2">
            <li>For billing questions, include your workspace name and the email you used to sign up.</li>
            <li>For technical issues, include the page URL and a screenshot if possible.</li>
          </ul>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

