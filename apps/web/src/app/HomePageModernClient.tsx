"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { AgentFlowShowcase } from "@/components/marketing/AgentFlowShowcase";
import { APP_URL } from "@/lib/appUrl";
import { marketingPlanPrices, MAX_SELF_SERVE_LIST_PRICE_USD } from "@/lib/marketingPricing";

type ContentPreview = {
  slug: string;
  title: string;
  description: string;
  date: string | null;
  tags: string[];
  audience: string | null;
};

const modules = [
  ["Command Centre", "Core"],
  ["Market Research", "Strategy"],
  ["ICP Segmentation", "Strategy"],
  ["Positioning Studio", "Strategy"],
  ["Messaging & Artifacts", "Content"],
  ["Campaigns", "Execution"],
  ["GTM Planner", "Execution"],
  ["Events", "Execution"],
  ["Content Studio", "Content"],
  ["Social Media", "Content"],
  ["Design & Assets", "Content"],
  ["Presentations", "Content"],
  ["Website & Pages", "Execution"],
  ["Analytics", "Insights"],
  ["Battlecards", "Sales"],
  ["Sales Intelligence", "Sales"],
  ["Customer Insights", "Insights"],
  ["AI Copilot", "Core"]
] as const;

const faq = [
  ["How long does setup take?", "Most teams are live in under 2 hours with demo data, then connect real channels module by module."],
  ["Do I need a technical team?", "No. AI Marketing Workbench is designed for operators and founders first. A developer helps only for deeper integrations."],
  ["Can I upgrade later?", "Yes. You can move from Starter to Growth or Enterprise any time from Settings."],
  [
    "Does AI usage have limits?",
    "Starter includes 100 AI workflow runs/month (Copilot + module generators). Growth and Enterprise are unlimited. Every plan includes the full module set — tiers differ by products, AI volume, seats, and support."
  ],
  ["Can we use our own Anthropic key?", "Yes. Each user can store their API key and run AI features in Copilot and module generators."],
  ["Is there a contract?", "Starter and Growth are month-to-month. Enterprise can be monthly or annual with custom terms."]
] as const;

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="saas-kicker">
      <span className="saas-kicker-dot" />
      {children}
    </div>
  );
}

export default function HomePageModernClient({
  latestPosts,
  featuredUseCases
}: {
  latestPosts: ContentPreview[];
  featuredUseCases: ContentPreview[];
}) {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const pricing = useMemo(
    () => [
      {
        name: "Starter",
        m: marketingPlanPrices.starter.monthly,
        a: marketingPlanPrices.starter.annualMonthlyEquivalent,
        bullets: ["All modules included — full platform", "100 AI workflow runs / month", "1 seat · up to 2 products"]
      },
      {
        name: "Growth",
        m: marketingPlanPrices.growth.monthly,
        a: marketingPlanPrices.growth.annualMonthlyEquivalent,
        bullets: ["Unlimited AI workflow runs", "3 seats · up to 10 products", "All modules", "Priority support"]
      },
      {
        name: "Enterprise",
        m: marketingPlanPrices.enterprise.monthly,
        a: marketingPlanPrices.enterprise.annualMonthlyEquivalent,
        bullets: [
          "Unlimited AI in-app; BYOK required (AI usage on your Anthropic bill)",
          "5 seats · up to 30 products · dedicated success",
          "Higher limits & procurement — talk to sales"
        ]
      }
    ],
    []
  );

  return (
    <div className="min-h-screen bg-page text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <style jsx global>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 600ms ease, transform 600ms ease;
        }
        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[560px] saas-hero-glow" aria-hidden />
      <div className="saas-grid pointer-events-none absolute inset-x-0 top-[60px] h-[560px] opacity-[0.22]" aria-hidden />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <section data-reveal className="grid gap-10 pt-10 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <div className="saas-pill">
              <span className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_8px_var(--color-amber)]" />
              Connected marketing workspace
            </div>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-tight text-text md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
              AI Marketing Workbench
            </h1>
            <p className="mt-4 max-w-2xl text-2xl font-semibold leading-tight tracking-tight text-text md:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
              The Marketing Operating System for teams that need clarity and execution
            </p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-text2">
              Run research, ICP definition, positioning, messaging, planning, campaigns, and analytics in one connected system — built for operators, not
              scattered docs.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex items-center justify-center rounded-lg bg-amber px-5 py-3 text-[15px] font-semibold text-heading shadow-lg shadow-card transition hover:bg-amber-hover">
                Book a Demo
              </Link>
              <Link href="/#how-it-works" className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-5 py-3 text-[15px] font-medium text-text transition hover:bg-surface3">
                See How It Works
              </Link>
              <Link href={`${APP_URL}/dashboard`} className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark">
                Open the app
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2 text-sm text-text2">
              {["Research → ICP → Positioning", "Artifacts + playbooks", "Campaigns + analytics"].map((x) => (
                <div key={x} className="rounded-full border border-border bg-surface px-3 py-2">
                  {x}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-text3">
              <span className="rounded-full border border-border bg-surface2 px-3 py-1.5">No module paywalls</span>
              <span className="rounded-full border border-border bg-surface2 px-3 py-1.5">All plans include all modules</span>
              <span className="rounded-full border border-border bg-surface2 px-3 py-1.5">Works best for multi-product teams</span>
            </div>
          </div>

          <div className="saas-gradient-border">
            <div className="saas-gradient-inner p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <Kicker>Live preview</Kicker>
                <div className="rounded-full border border-border bg-surface2 px-3 py-1 text-[12px] font-medium text-text2">Powered by Claude Sonnet</div>
              </div>

              <div className="mt-5 saas-bento">
                <div className="saas-bento-card saas-bento-card-hover p-5 md:col-span-7">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Strategy layer</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                    Reusable artifacts
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text2">
                    Positioning and messaging stay connected to the research they were built from, and compound across launches.
                  </p>
                  <div className="mt-4 grid gap-2">
                    {["Positioning guide", "Message map", "Launch brief"].map((x) => (
                      <div key={x} className="rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-text2">
                        {x}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="saas-bento-card saas-bento-card-hover p-5 md:col-span-5">
                  <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Agent workers</div>
                  <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                    Background workflows
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-text2">Queue long research + drafting tasks, then review the structured outputs.</p>
                  <div className="mt-4 grid gap-2 text-[12px] text-text2">
                    {["Research queued", "Artifacts generated", "Review + reuse"].map((x) => (
                      <div key={x} className="rounded-xl border border-border bg-surface2 px-3 py-2">
                        {x}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="saas-bento-card p-5 md:col-span-12">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium text-text">Try it now</div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`${APP_URL}/dashboard`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark">
                        View the workspace
                      </Link>
                      <Link href="/pricing" className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-medium text-text transition hover:bg-surface3">
                        Explore plans
                      </Link>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      "Market research → ICPs → positioning built on shared context",
                      "Campaigns, planning, and analytics tied to the same workspace thread",
                      "Cross-module actions that turn strategy into execution",
                      "A system teams can reuse instead of rebuilding from scratch"
                    ].map((x) => (
                      <div key={x} className="rounded-xl border border-border bg-surface2 px-3 py-2.5 text-[13px] leading-snug text-text2">
                        {x}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section data-reveal className="mt-10">
          <div className="saas-card saas-card-hover saas-glass px-6 py-5 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-medium text-text">Designed for modern teams shipping launches every month.</div>
              <div className="flex flex-wrap gap-2 text-xs text-text2">
                {["Product marketing", "Founders", "GTM leaders", "Multi-product teams"].map((x) => (
                  <span key={x} className="rounded-full border border-border bg-surface px-3 py-1.5">
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" data-reveal className="mt-24">
          <Kicker>Platform</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            A modern marketing system — built to compound
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text2 sm:text-[15px]">
            Replace one-off prompts and scattered docs with an operating layer that keeps context, decisions, artifacts, and execution connected.
          </p>

          <div className="mt-8 saas-bento">
            <div className="saas-bento-card saas-bento-card-hover p-6 md:col-span-6">
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Connected context</div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                Research that stays usable
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">
                Capture market signals, competitor moves, and customer insights once — then reuse them across positioning, campaigns, and enablement.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {["Sources + notes", "Competitor intel", "Customer themes", "Evidence trail"].map((x) => (
                  <div key={x} className="rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-text2">
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div className="saas-bento-card saas-bento-card-hover p-6 md:col-span-6">
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Reusable strategy</div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                Artifacts your team can ship from
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">
                Generate structured outputs (positioning, message maps, briefs) and keep them versioned, reviewable, and easy to reuse.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {["Positioning + proof", "Messaging frameworks", "Launch playbooks", "Sales enablement"].map((x) => (
                  <div key={x} className="rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-text2">
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div className="saas-bento-card saas-bento-card-hover p-6 md:col-span-7">
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Execution layer</div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                Planning + campaigns tied to strategy
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">Keep GTM planning, campaign work, and analytics connected to the decisions that matter.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {["GTM planner", "Campaign board", "Analytics"].map((x) => (
                  <div key={x} className="rounded-xl border border-border bg-surface2 px-3 py-2 text-[13px] text-text2">
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div className="saas-bento-card saas-bento-card-hover p-6 md:col-span-5">
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Agentic automation</div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                Work runs in the background
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">Agent workers handle long workflows and structured generation so operators stay in flow.</p>
              <div className="mt-4 grid gap-2 text-[13px] text-text2">
                {["Queue workflows", "Review diffs", "Ship with confidence"].map((x) => (
                  <div key={x} className="rounded-xl border border-border bg-surface px-3 py-2">
                    {x}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="modules" data-reveal className="saas-card mt-24 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-text md:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            All 18 modules
          </h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {modules.map(([name, cat]) => (
              <div
                key={name}
                className={`rounded-xl border p-3 text-sm transition ${
                  cat === "Core"
                    ? "border-accent/25 bg-accent/10"
                    : cat === "Sales"
                      ? "border-[rgba(184,255,108,0.35)] bg-[rgba(184,255,108,0.10)]"
                      : "border-border bg-surface2"
                } hover:border-accent/25 hover:shadow-sm`}
              >
                <div className="font-medium text-text">{name}</div>
                <div className="mt-1 text-xs text-text2">{cat}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" data-reveal className="mt-24">
          <Kicker>Workflow</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            A workflow that stays connected from insight to action
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text2 sm:text-[15px]">
            Each step builds on shared workspace context, so the strategy layer stays connected to execution and measurement instead of resetting across tools.
          </p>

          <div className="mt-8 saas-bento">
            {[
              ["01", "Research the market", "Capture signals, competitors, and customer context in one workspace."],
              ["02", "Define the ICP focus", "Prioritize segments and strategic choices you can execute on."],
              ["03", "Build positioning + messaging", "Create reusable artifacts grounded in shared context."],
              ["04", "Execute and measure", "Run campaigns and review outcomes without losing the thread."]
            ].map(([n, t, d]) => (
              <div key={n} className="saas-bento-card saas-bento-card-hover p-6 md:col-span-3">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light font-mono text-[12px] font-semibold text-primary-dark">
                    {n}
                  </div>
                  <div>
                    <div className="text-[15px] font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                      {t}
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-text2">{d}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="agent-workers" data-reveal className="mt-24">
          <Kicker>Automation</Kicker>
          <div className="mt-3 grid gap-4 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                Agent workers that run work in the background
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-text2">
                Agent workers run long tasks like research runs, drafts, and structured outputs, so your team stays unblocked while the system does the heavy lifting.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/docs#agent-workers" className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3">
                  Read how it works
                </Link>
                <Link href={`${APP_URL}/dashboard/work`} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark">
                  View workbench
                </Link>
              </div>
            </div>
            <div className="saas-card saas-card-hover p-6 sm:p-7">
              <div className="text-sm font-semibold text-text">What agent workers do</div>
              <div className="mt-4 grid gap-3">
                {[
                  ["Run long workflows", "Queue research and generation tasks without blocking the UI."],
                  ["Produce structured outputs", "Turn inputs into briefs, segments, battlecards, and action plans."],
                  ["Keep teams aligned", "Log progress and results so everyone sees what changed and why."],
                  ["Guardrails by design", "Prefer explicit context; avoid inventing facts and unknown URLs."]
                ].map(([t, d]) => (
                  <div key={t} className="rounded-xl border border-border bg-surface2 p-4">
                    <div className="text-[13px] font-semibold text-text">{t}</div>
                    <div className="mt-1 text-sm leading-relaxed text-text2">{d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section data-reveal className="mt-10">
          <AgentFlowShowcase />
        </section>

        <section data-reveal className="mt-24">
          <Kicker>Use cases</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Built for teams running real marketing systems
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {featuredUseCases.map((entry) => (
              <div key={entry.slug} className="saas-card saas-card-hover p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">{entry.audience ?? "Use Case"}</div>
                <div className="mt-2 text-[15px] font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                  <Link href={`/use-cases/${entry.slug}`} className="transition hover:text-primary">
                    {entry.title}
                  </Link>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text2">{entry.description}</p>
                <div className="mt-4">
                  <Link href={`/use-cases/${entry.slug}`} className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-3.5 py-2 text-[13px] font-medium text-text transition hover:bg-surface3">
                    View use case
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" data-reveal className="mt-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Kicker>Pricing</Kicker>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                Simple plans
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setAnnual((v) => !v)}
              className="rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text2 transition hover:bg-surface3"
            >
              {annual ? "Annual billing (~20% off)" : "Monthly billing"}
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {pricing.map((p) => (
              <div key={p.name} className="saas-card saas-card-hover flex flex-col p-6">
                <div className="text-base font-semibold text-text">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                  <span className="text-4xl font-semibold tracking-tight text-text">${annual ? p.a : p.m}</span>
                  <span className="text-sm text-text2">/mo</span>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-text2">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 grid gap-2">
                  <Link href={`${APP_URL}/signup?plan=${p.name.toLowerCase()}`} className="inline-flex w-full items-center justify-center rounded-lg bg-amber px-4 py-3 text-sm font-semibold text-heading shadow-lg shadow-card hover:bg-amber-hover">
                    Choose {p.name}
                  </Link>
                  <Link href="/pricing" className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-3 text-sm font-medium text-text hover:bg-surface3">
                    Compare plans
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-text2">
            {`List prices top out at $${MAX_SELF_SERVE_LIST_PRICE_USD}/mo on this page. Beyond that — `}
            <Link href="/contact" className="font-medium text-link hover:underline">
              talk to sales
            </Link>
            .
          </p>
        </section>

        <section data-reveal className="mt-24">
          <Kicker>Resources</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Latest from the blog
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latestPosts.map((p) => (
              <div key={p.slug} className="saas-card saas-card-hover p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">{p.date ?? "Latest"}</div>
                <div className="mt-2 text-[15px] font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                  <Link href={`/blog/${p.slug}`} className="transition hover:text-primary">
                    {p.title}
                  </Link>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text2">{p.description}</p>
                <div className="mt-4">
                  <Link href={`/blog/${p.slug}`} className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-3.5 py-2 text-[13px] font-medium text-text transition hover:bg-surface3">
                    Read post
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" data-reveal className="mt-24">
          <h2 className="text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            FAQ
          </h2>
          <div className="mt-6 space-y-2">
            {faq.map(([q, a], idx) => (
              <div key={q} className="overflow-hidden rounded-xl border border-border bg-surface">
                <button
                  type="button"
                  onClick={() => setOpenFaq((v) => (v === idx ? -1 : idx))}
                  className="flex w-full items-center justify-between px-4 py-4 text-left text-[15px] font-medium text-text transition hover:bg-surface2"
                >
                  <span>{q}</span>
                  <span className="ml-2 font-mono text-text2">{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx ? <div className="border-t border-border px-4 pb-4 pt-1 text-sm leading-relaxed text-text2">{a}</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="saas-card mt-24 border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-surface p-8 text-center sm:p-10">
          <h3 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Build a marketing system that compounds
          </h3>
          <p className="mt-3 text-text2">Bring your research, ICPs, positioning, planning, and execution into one connected workspace built for modern marketing teams.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/contact" className="inline-flex rounded-lg bg-amber px-6 py-3 text-[15px] font-semibold text-heading shadow-lg shadow-card hover:bg-amber-hover">
              Book a Demo
            </Link>
            <Link href={`${APP_URL}/dashboard`} className="inline-flex rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-focus hover:bg-primary-dark">
              Open the app
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

