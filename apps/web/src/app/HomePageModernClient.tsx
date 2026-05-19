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

const faq: [string, string][] = [
  ["How long does setup take?", "Most teams are live in under 2 hours with demo data, then connect real channels module by module."],
  ["Do I need a technical team?", "No. AI Marketing Workbench is designed for operators and founders first. A developer helps only for deeper integrations."],
  ["Can I upgrade later?", "Yes. You can move from Starter to Growth or Enterprise any time from Settings."],
  [
    "Does AI usage have limits?",
    "Starter includes 100 AI workflow runs/month (Copilot + module generators). Growth and Enterprise are unlimited. Every plan includes the full module set — tiers differ by products, AI volume, seats, and support."
  ],
  ["Can we use our own Anthropic key?", "Yes. A workspace admin adds a workspace-level Anthropic key under Settings → AI integration. Starter and Growth can also use the platform key if your operator enables it. Enterprise requires BYOK — Anthropic token usage is billed by Anthropic directly to the customer's account."],
  ["Is there a contract?", "Starter and Growth are month-to-month. Enterprise can be monthly or annual with custom terms."],
  ["How is this different from ChatGPT or Claude?", "Using Claude directly means starting from a blank slate every session — no memory of your product, ICP, or positioning. AI Marketing Workbench pre-loads every module with your product context, so you get PMM-structured outputs (positioning guides, message maps, GTM plans) without writing a single prompt. Claude is the engine; we built the operating layer on top."],
  ["How is this different from research-only tools?", "Research-only tools stop at insight — they analyze your market but don't produce execution deliverables. We go the full chain: research → ICP → positioning → messaging → campaign → content → battlecard → sales assets. Every module generates a first draft, not just a report."],
  ["Do I need to configure anything before it works?", "Add a product brief (name, category, ICP summary, positioning) and the AI is immediately calibrated for your market. Most teams are generating their first ICP segments within 5 minutes of signing up."]
];

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
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-pulse-dot {
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        @keyframes generating-shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .animate-generating {
          animation: generating-shimmer 1.8s ease-in-out infinite;
        }
      `}</style>

      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[560px] saas-hero-glow" aria-hidden />
      <div className="saas-grid pointer-events-none absolute inset-x-0 top-[60px] h-[560px] opacity-[0.22]" aria-hidden />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">

        {/* ── SECTION 1: HERO ── */}
        <section data-reveal className="grid gap-10 pt-10 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <div className="saas-pill">
              <span className="h-1.5 w-1.5 rounded-full bg-amber shadow-[0_0_8px_var(--color-amber)]" />
              AI-first PMM operating system
            </div>

            <h1 className="mt-5 text-4xl font-semibold leading-[1.06] tracking-tight text-text md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
              AI that writes your GTM — not just analyzes it
            </h1>
            <p className="mt-5 max-w-xl text-xl leading-relaxed text-text2">
              From ICP segments to positioning to campaigns to battlecards — every module generates a first draft in seconds, pre-loaded with your product context.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`${APP_URL}/signup?plan=starter`}
                className="inline-flex items-center justify-center rounded-lg bg-amber px-5 py-3 text-[15px] font-semibold text-heading shadow-lg shadow-card transition hover:bg-amber-hover"
              >
                Start free →
              </Link>
              <Link
                href="/#how-it-works"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-5 py-3 text-[15px] font-medium text-text transition hover:bg-surface3"
              >
                See how it works
              </Link>
              <Link
                href={`${APP_URL}/dashboard`}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-[15px] font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark"
              >
                View demo
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-text3">
              {["No demo call required", "No credit card", "All 18 modules included"].map((x) => (
                <span key={x} className="rounded-full border border-border bg-surface2 px-3 py-1.5">
                  {x}
                </span>
              ))}
            </div>
          </div>

          {/* Hero right: mock AI generating card */}
          <div className="saas-gradient-border">
            <div className="saas-gradient-inner p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-text">
                  <span className="text-primary">✦</span>
                  <span>AI Copilot — Writing GTM plan...</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-teal animate-pulse-dot" />
                </div>
                <div className="rounded-full border border-border bg-surface2 px-3 py-1 text-[11px] font-medium text-text2">
                  Powered by Claude Sonnet
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div>
                    <div className="text-[13px] font-semibold text-text">ICP Segments</div>
                    <div className="mt-0.5 text-[11px] text-text3">3 segments scored + prioritized</div>
                  </div>
                  <span className="rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] font-semibold text-teal">
                    Generated in 28s
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div>
                    <div className="text-[13px] font-semibold text-text">Positioning narrative</div>
                    <div className="mt-0.5 text-[11px] text-text3">Full positioning doc + proof points</div>
                  </div>
                  <span className="rounded-full border border-teal/30 bg-teal/10 px-3 py-1 text-[11px] font-semibold text-teal">
                    Generated in 45s
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div>
                    <div className="text-[13px] font-semibold text-text">GTM Plan</div>
                    <div className="mt-0.5 text-[11px] text-text3">Auto-filling from campaign handoff...</div>
                  </div>
                  <span className="rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-[11px] font-semibold text-amber animate-generating">
                    Generating...
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                <span className="text-[12px] text-text2">Claude Sonnet · Pre-loaded with product context</span>
                <span className="text-[11px] font-semibold text-primary">✦ Active</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: TRUST BAR ── */}
        <section data-reveal className="mt-10">
          <div className="saas-card saas-glass px-6 py-5 sm:px-8">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
              {[
                ["18 modules", "Full GTM stack"],
                ["One workspace", "Not per-product pricing"],
                ["No research limits", "Unlimited runs on Growth"],
                ["Start in 60s", "No demo required"]
              ].map(([stat, label], i) => (
                <div key={stat} className={`text-center ${i < 3 ? "sm:border-r sm:border-border" : ""}`}>
                  <div className="text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                    {stat}
                  </div>
                  <div className="mt-1 text-xs text-text3">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 3: AI DOES THE HEAVY LIFTING ── */}
        <section data-reveal className="mt-24">
          <Kicker>AI-powered</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Your GTM, written. In minutes, not days.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text2 sm:text-[15px]">
            Claude is pre-configured for every PMM workflow — with your product brief, ICP, and positioning already loaded. No prompt engineering. No blank page.
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {/* WITHOUT column */}
            <div className="rounded-2xl border border-border bg-surface2 p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text3 mb-4">
                Without AI Marketing Workbench
              </div>
              <ul className="space-y-3">
                {[
                  "Paste context into ChatGPT every session — it forgets everything",
                  "Write prompts from scratch for each deliverable",
                  "Generic output with no knowledge of your product or segments",
                  "Switch between 6 tools to finish one GTM plan",
                  "3 days to draft positioning, ICP, campaign, and content"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text2">
                    <span className="mt-0.5 shrink-0 text-text3">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* WITH column */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-4">
                With AI Marketing Workbench
              </div>
              <ul className="space-y-3">
                {[
                  "Claude knows your product, ICP, and positioning from day one",
                  "Every module has a built-in \"Generate with AI\" button",
                  "Outputs are pre-filled with your actual segments and proof points",
                  "Full GTM chain in one connected workspace",
                  "First drafts across all modules in under 10 minutes"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text">
                    <span className="mt-0.5 shrink-0 text-teal font-semibold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Time-saving stat cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["28s", "ICP segments generated"],
              ["45s", "Positioning narrative drafted"],
              ["90s", "GTM plan auto-filled"],
              ["60s", "Battlecard written"]
            ].map(([time, label]) => (
              <div key={label} className="saas-card p-4 text-center">
                <div className="text-3xl font-semibold tracking-tight text-primary" style={{ fontFamily: "var(--font-heading)" }}>
                  {time}
                </div>
                <div className="mt-1 text-[12px] text-text2">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 4: EXECUTION CHAIN DIAGRAM ── */}
        <section id="how-it-works" data-reveal className="mt-24">
          <Kicker>Workflow</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            From insight to revenue — one connected chain
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text2 sm:text-[15px]">
            Each module feeds the next. ICP informs positioning. Positioning drives messaging. Campaign handoffs auto-fill the GTM plan. No context lost between steps.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["01", "Market Research", "Capture signals, competitors, and customer context", "~2 min"],
              ["02", "ICP Segmentation", "AI generates scored segments from your product brief", "~30s"],
              ["03", "Positioning Studio", "First draft positioning narrative, grounded in ICP", "~45s"],
              ["04", "Messaging & Artifacts", "Message map, launch brief, value props", "~60s"],
              ["05", "Campaigns", "Kanban campaign board, briefed from positioning", "~2 min"],
              ["06", "GTM Planner", "Auto-filled from campaign handoff", "~90s"],
              ["07", "Content Studio", "Blog posts, emails, landing copy written by AI", "~60s"],
              ["08", "Social Media", "Social posts generated per segment", "~30s"],
              ["09", "Battlecards", "Competitive rebuttals drafted from your positioning", "~60s"],
              ["10", "Sales Intelligence", "Deal stage assets + objection handling", "~90s"]
            ].map(([num, name, desc, time], idx, arr) => (
              <div key={num} className="relative">
                <div className="saas-card saas-card-hover p-4 h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex h-6 w-8 items-center justify-center rounded bg-primary-light font-mono text-[10px] font-semibold text-primary-dark">
                      {num}
                    </span>
                    <span className="rounded-full border border-border bg-surface2 px-2 py-0.5 text-[10px] text-text3">
                      {time}
                    </span>
                  </div>
                  <div className="text-[13px] font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                    {name}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-text2">{desc}</div>
                </div>
                {idx < arr.length - 1 && (idx + 1) % 5 !== 0 ? (
                  <div className="absolute -right-1.5 top-1/2 z-10 hidden -translate-y-1/2 text-text3 lg:block">→</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 5: FEATURES BENTO ── */}
        <section id="features" data-reveal className="mt-24">
          <Kicker>Platform</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            A modern marketing system — built to compound
          </h2>

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
                {["Sources", "Competitor intel", "Customer themes", "Evidence trail"].map((x) => (
                  <div key={x} className="rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-text2">
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div className="saas-bento-card saas-bento-card-hover p-6 md:col-span-6">
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Reusable strategy</div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                Artifacts your team ships from
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">
                Generate structured outputs and keep them versioned, reviewable, and easy to reuse across every launch.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {["Positioning guide", "Message map", "Launch playbook", "Sales enablement"].map((x) => (
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
              <p className="mt-2 text-sm leading-relaxed text-text2">
                Keep GTM planning, campaign work, and analytics connected to the decisions that matter. Multi-plan GTM Planner with phase checklists.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {["GTM planner", "Campaign board", "Analytics", "Events"].map((x) => (
                  <div key={x} className="rounded-xl border border-border bg-surface2 px-3 py-2 text-[13px] text-text2">
                    {x}
                  </div>
                ))}
              </div>
            </div>

            <div className="saas-bento-card saas-bento-card-hover p-6 md:col-span-5">
              <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">Sales &amp; customer intelligence</div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                Close the loop
              </div>
              <p className="mt-2 text-sm leading-relaxed text-text2">
                Objection rebuttals, deal stage assets, VOC library, win/loss tracking — all connected to your positioning.
              </p>
              <div className="mt-4 grid gap-2 text-[13px] text-text2">
                {["Sales Intelligence", "Customer Insights", "Battlecards"].map((x) => (
                  <div key={x} className="rounded-xl border border-border bg-surface px-3 py-2">
                    {x}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: ALL 18 MODULES ── */}
        <section id="modules" data-reveal className="saas-card mt-24 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-text md:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            All 18 modules
          </h2>
          <p className="mt-2 text-sm text-text2">Every plan includes every module — no paywalls, no add-ons.</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {modules.map(([name, cat]) => (
              <div
                key={name}
                className={`rounded-xl border p-3 text-sm transition ${
                  cat === "Core"
                    ? "border-primary/25 bg-primary/10"
                    : cat === "Sales"
                      ? "border-teal/30 bg-teal/10"
                      : cat === "Insights"
                        ? "border-amber/25 bg-amber/10"
                        : "border-border bg-surface2"
                } hover:border-primary/25 hover:shadow-sm`}
              >
                <div className="font-medium text-text">{name}</div>
                <div className="mt-1 text-xs text-text2">{cat}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 7: BUILT FOR YOUR ROLE ── */}
        <section data-reveal className="mt-24">
          <Kicker>Use cases</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Built for every PMM role
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text2 sm:text-[15px]">
            Whether you&apos;re a solo operator or leading a GTM team, the workbench adapts to how you work.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                role: "Solo PMM / Founder",
                bullets: [
                  "Generate ICP + positioning in one session",
                  "Draft launches, campaigns, and content solo",
                  "Keep strategy and execution in sync automatically"
                ]
              },
              {
                role: "PMM Team",
                bullets: [
                  "Shared workspace — everyone builds on the same context",
                  "No duplicated research or conflicting positioning docs",
                  "Campaigns and GTM plans linked to shared strategy"
                ]
              },
              {
                role: "VP / Head of Marketing",
                bullets: [
                  "Standardized artifacts across every product",
                  "Visibility into all campaigns, GTM plans, and content",
                  "AI output quality stays consistent at scale"
                ]
              },
              {
                role: "Consultant / Agency",
                bullets: [
                  "Separate workspace per client, no context bleed",
                  "Generate structured deliverables 10x faster",
                  "Reusable frameworks across every engagement"
                ]
              }
            ].map(({ role, bullets }) => (
              <div key={role} className="saas-card saas-card-hover flex flex-col p-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text3">Built for</div>
                <div className="mt-1 text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                  {role}
                </div>
                <ul className="mt-4 flex-1 space-y-2">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-text2">
                      <span className="mt-0.5 shrink-0 text-teal">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Link
                    href="/use-cases"
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-3.5 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
                  >
                    View use case →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 8: WHY NOT JUST USE CHATGPT? ── */}
        <section data-reveal className="mt-24">
          <Kicker>AI-native</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Ready to go beyond generic AI?
          </h2>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {/* Generic AI column */}
            <div className="rounded-2xl border border-border bg-surface2 p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text3 mb-4">
                Claude / ChatGPT / Gemini (standalone)
              </div>
              <ul className="space-y-3">
                {[
                  "Limited to one context window — every session starts from zero",
                  "LLM inference only — no structured scoring or module logic",
                  "Generic, one-off outputs — no PMM frameworks, no connected workflows",
                  "You write every prompt from scratch",
                  "Nothing remembered between sessions"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text2">
                    <span className="mt-0.5 shrink-0 text-text3">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI Marketing Workbench column */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary mb-4">
                AI Marketing Workbench
              </div>
              <ul className="space-y-3">
                {[
                  "Product context loaded once, used everywhere",
                  "PMM-structured outputs — positioning guides, message maps, GTM plans",
                  "Connected workflows — ICP feeds positioning feeds campaign",
                  "Built-in \"Generate with AI\" in every module — zero prompt writing",
                  "Every output grounded in your actual segments and proof points"
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-text">
                    <span className="mt-0.5 shrink-0 text-teal font-semibold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── SECTION 9: AGENT WORKERS ── */}
        <section id="agent-workers" data-reveal className="mt-24">
          <Kicker>Automation</Kicker>
          <div className="mt-3 grid gap-4 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                Agent workers run the heavy lifting in the background
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-text2">
                Agent workers run long tasks like research runs, drafts, and structured outputs — so your team stays unblocked while the system does the work.
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

        {/* ── SECTION 10: PRICING ── */}
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

          {/* Competitor comparison callout */}
          <div className="mt-6 rounded-2xl border border-amber/30 bg-amber/5 p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0 text-lg text-amber">✓</span>
              <div>
                <div className="text-[14px] font-semibold text-text">
                  Most tools charge $199–$399 per product per month. We charge per workspace.
                </div>
                <p className="mt-1 text-sm text-text2">
                  2 products on a competitor = $398–$798/mo. Here, that&apos;s $99.
                </p>
              </div>
            </div>
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
                  <Link
                    href={`${APP_URL}/signup?plan=${p.name.toLowerCase()}`}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-amber px-4 py-3 text-sm font-semibold text-heading shadow-lg shadow-card hover:bg-amber-hover"
                  >
                    Choose {p.name}
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-3 text-sm font-medium text-text hover:bg-surface3"
                  >
                    Compare plans
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* What's included on every plan */}
          <div className="mt-8 rounded-2xl border border-border bg-surface p-5 sm:p-6">
            <div className="text-[13px] font-semibold text-text mb-3">What&apos;s included on every plan</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                "All 18 modules (no paywalls)",
                "No research run limits on Growth+",
                "No per-product charges",
                "Self-serve — start in 60 seconds"
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-text2">
                  <span className="shrink-0 text-teal">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-text2">
            {`List prices top out at $${MAX_SELF_SERVE_LIST_PRICE_USD}/mo on this page. Beyond that — `}
            <Link href="/contact" className="font-medium text-link hover:underline">
              talk to sales
            </Link>
            .
          </p>
        </section>

        {/* ── SECTION 11: FEATURED USE CASES ── */}
        <section data-reveal className="mt-24">
          <Kicker>Use cases</Kicker>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            How teams use AI Marketing Workbench
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
                  <Link
                    href={`/use-cases/${entry.slug}`}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-3.5 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
                  >
                    View use case
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 12: BLOG ── */}
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
                  <Link
                    href={`/blog/${p.slug}`}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-3.5 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
                  >
                    Read post
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 13: FAQ ── */}
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
                {openFaq === idx ? (
                  <div className="border-t border-border px-4 pb-4 pt-1 text-sm leading-relaxed text-text2">{a}</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 14: BOTTOM CTA ── */}
        <section data-reveal className="saas-card mt-24 border-primary/25 bg-gradient-to-br from-primary/10 via-surface to-surface p-8 text-center sm:p-10">
          <h3 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Stop starting from scratch. Build a GTM motion that compounds.
          </h3>
          <p className="mt-3 max-w-2xl mx-auto text-text2">
            Your research, ICP, positioning, campaigns, and content — all in one connected workspace. AI writes the first draft. You close the deal.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`${APP_URL}/signup?plan=starter`}
              className="inline-flex rounded-lg bg-amber px-6 py-3 text-[15px] font-semibold text-heading shadow-lg shadow-card hover:bg-amber-hover"
            >
              Start free — no demo required
            </Link>
            <Link
              href={`${APP_URL}/dashboard`}
              className="inline-flex rounded-lg bg-primary px-6 py-3 text-[15px] font-semibold text-white shadow-lg shadow-focus hover:bg-primary-dark"
            >
              View the workspace
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
