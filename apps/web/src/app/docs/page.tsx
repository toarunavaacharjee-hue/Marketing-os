import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Docs",
  description: "Documentation for AI Marketing Workbench: setup, workflows, and best practices."
};

const sections = [
  {
    title: "Getting started",
    items: ["Create a workspace", "Add your product", "Apply templates", "Run your first weekly loop"]
  },
  {
    title: "Core workflows",
    items: ["ICP segmentation", "Positioning canvas", "Messaging framework", "Campaign execution"]
  },
  {
    title: "AI Copilot",
    items: ["How prompts work", "Using your own Anthropic key", "Guardrails and review"]
  }
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <header className="mt-10">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Resources</div>
          <h1
            className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-text md:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Docs
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
            Quick guides to set up your workspace, apply templates, and run repeatable GTM workflows.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {sections.map((s) => (
            <div key={s.title} className="saas-card saas-card-hover p-6">
              <div className="text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                {s.title}
              </div>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text2">
                {s.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section id="agent-workers" className="mt-8 saas-card p-6 sm:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Automation</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
            Agent workers (background jobs)
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-text2 sm:text-[15px]">
            Agent workers run long tasks asynchronously so the UI stays fast. They’re used for workflows like research runs,
            structured generation (briefs, segments, battlecards), and scheduled jobs.
          </p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {[
              ["Queue + retry", "Long tasks run in the background with retries and clear status."],
              ["Structured outputs", "Results are saved in your workspace so teams can review and iterate."],
              ["Guardrails", "When data is missing, the system prefers TBD over invented facts or links."],
              ["Visibility", "You can track progress in module pages and in your workbench views."]
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-border bg-surface2 p-4">
                <div className="text-[13px] font-semibold text-text">{t}</div>
                <div className="mt-1 text-sm leading-relaxed text-text2">{d}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-sm text-text2">
            For questions about background runs or troubleshooting, email{" "}
            <a className="underline decoration-border underline-offset-4 hover:text-text" href="mailto:support@aimarketingworkbench.com">
              support@aimarketingworkbench.com
            </a>
            .
          </div>
        </section>

        <section className="mt-8 saas-card p-6 sm:p-8">
          <div className="text-sm font-semibold text-text">Need help?</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">Email support and we’ll point you to the right workflow.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="mailto:support@aimarketingworkbench.com"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              support@aimarketingworkbench.com
            </a>
            <Link
              href="/resources"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              All resources
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

