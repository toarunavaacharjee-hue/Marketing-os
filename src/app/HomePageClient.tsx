"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { marketingPlanPrices, MAX_SELF_SERVE_LIST_PRICE_USD } from "@/lib/marketingPricing";

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
];

export default function HomePageClient() {
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
        bullets: [
          "All modules included — full platform",
          "100 AI workflow runs / month",
          "1 seat · up to 2 products"
        ]
      },
      {
        name: "Growth",
        m: marketingPlanPrices.growth.monthly,
        a: marketingPlanPrices.growth.annualMonthlyEquivalent,
        bullets: [
          "Unlimited AI workflow runs",
          "3 seats · up to 10 products",
          "All modules",
          "Priority support"
        ]
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

  const latest = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <style jsx global>{`
        [data-reveal] {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 600ms ease, transform 600ms ease;
        }
        [data-reveal].is-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[520px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <section data-reveal className="grid gap-10 pt-8 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <div className="saas-pill">
              <span className="h-1.5 w-1.5 rounded-full bg-[#b8ff6c] shadow-[0_0_8px_#b8ff6c]" />
              PMM &amp; GTM platform
            </div>
            <h1
              className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-text md:text-5xl lg:text-[3.25rem]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              AI Marketing Workbench
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-text2">
              The operating system for product marketing and GTM teams. Connect ICP, positioning, messaging, campaigns, and
              measurement loops — then turn them into repeatable weekly workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup?plan=starter"
                className="inline-flex items-center justify-center rounded-lg bg-[#b8ff6c] px-5 py-3 text-[15px] font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/20 transition hover:bg-[#c8ff7c]"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-5 py-3 text-[15px] font-medium text-text transition hover:bg-surface3"
              >
                See pricing
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-5 py-3 text-[15px] font-medium text-text2 transition hover:bg-surface3 hover:text-text"
              >
                Read the blog
              </Link>
            </div>
            <div className="saas-card mt-8 flex flex-wrap items-center gap-5 px-5 py-4 text-sm">
              <div className="flex -space-x-2">
                <div className="h-9 w-9 rounded-full border-2 border-[#141420] bg-gradient-to-br from-[#7c6cff] to-[#5a4fd4]" />
                <div className="h-9 w-9 rounded-full border-2 border-[#141420] bg-[#b8ff6c]" />
                <div className="h-9 w-9 rounded-full border-2 border-[#141420] bg-[#2a2e3f]" />
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-text2">
                Trusted by <span className="font-medium text-text">120+ growth teams</span>
              </div>
              <div className="hidden h-8 w-px bg-border sm:block" />
              <div className="text-text2">
                Avg setup <span className="font-mono text-text">1.8h</span>
              </div>
            </div>
          </div>
          <div className="saas-card saas-card-hover p-6 sm:p-7">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-4 font-mono text-[11px] text-text3">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="ml-2 truncate">app — Marketing Workbench</span>
            </div>
            <div className="rounded-xl border border-border bg-surface2 p-4 shadow-inner">
              <div className="text-sm font-medium text-text">What you get on day 1</div>
              <div className="mt-3 grid gap-2 text-sm text-text2">
                {[
                  "Templates to seed launch plans and event playbooks",
                  "Marketing Workbench: your unified cross-module view",
                  "AI actions: Segment → Messaging draft, Positioning → Pitch battlecard",
                  "Workflow run logs + updates so teams stay aligned"
                ].map((x) => (
                  <div key={x} className="rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] leading-snug">
                    {x}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/work"
                  className="rounded-lg bg-[#7c6cff] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#7c6cff]/25 transition hover:bg-[#8b7cff]"
                >
                  Open Marketing Workbench
                </Link>
                <Link
                  href="/dashboard/getting-started"
                  className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm font-medium text-text transition hover:bg-surface3"
                >
                  Apply templates
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" data-reveal className="mt-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Platform</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Built for modern GTM teams
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="saas-card saas-card-hover p-6 md:col-span-2">
              <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wider text-[#7c6cff]">AI Copilot</div>
              <div className="mt-2 text-lg font-medium text-text">Strategic answers, shipped as actions</div>
              <p className="mt-2 text-sm leading-relaxed text-text2">
                Ask strategic questions, get tactical action plans, and run follow-ups instantly.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[12px]">
                {["Response ~8s", "Weekly plans: 24", "Success: 96%"].map((m) => (
                  <div key={m} className="rounded-lg border border-border bg-surface2 px-2 py-3 font-mono text-text2">
                    {m}
                  </div>
                ))}
              </div>
            </div>
            {[
              "Unified analytics",
              "Battlecards & objection handling",
              "Campaign workflow orchestration",
              "Content + social engine",
              "Customer insight loops"
            ].map((f) => (
              <div key={f} className="saas-card saas-card-hover p-5">
                <div className="text-[15px] font-medium text-text">{f}</div>
                <p className="mt-2 text-sm leading-relaxed text-text2">
                  Built for high-velocity GTM teams that need clarity and execution speed.
                </p>
              </div>
            ))}
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Workflow</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            How it works
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              "Define ICP segments and priorities",
              "Generate and refine positioning + messaging",
              "Seed plans using templates + workflows",
              "Track work + outcomes weekly"
            ].map((s, i) => (
              <div key={s} className="saas-card saas-card-hover p-5">
                <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#7c6cff]/20 font-mono text-sm font-semibold text-[#c4b8ff]">
                  {i + 1}
                </div>
                <p className="text-sm leading-relaxed text-text2">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="agent-workers" data-reveal className="mt-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Automation</div>
          <div className="mt-2 grid gap-4 lg:grid-cols-2 lg:items-start">
            <div>
              <h2
                className="text-3xl font-semibold tracking-tight text-text md:text-4xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Agent workers that run work in the background
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-text2">
                Not everything should be a button-click. Agent workers run long tasks—like research runs, drafts, and
                structured outputs—so your team stays unblocked while the system does the heavy lifting.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link
                  href="/docs#agent-workers"
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
                >
                  Read how it works
                </Link>
                <Link
                  href="/dashboard/work"
                  className="inline-flex items-center justify-center rounded-lg bg-[#7c6cff] px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-[#7c6cff]/25 transition hover:bg-[#8b7cff]"
                >
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

        <section id="pricing" data-reveal className="mt-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Pricing</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
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
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#7c6cff]" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 grid gap-2">
                  <Link
                    href={`/signup?plan=${p.name.toLowerCase()}`}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-[#b8ff6c] px-4 py-3 text-sm font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 hover:bg-[#c8ff7c]"
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
          <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-text2">
            {`List prices top out at $${MAX_SELF_SERVE_LIST_PRICE_USD}/mo on this page. Beyond that — `}
            <Link href="/contact" className="font-medium text-[#c4b8ff] hover:underline">
              talk to sales
            </Link>
            .
          </p>
        </section>

        <section data-reveal className="mt-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Resources</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-text md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Latest from the blog
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {latest.map((p) => (
              <div key={p.slug} className="saas-card saas-card-hover p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">{p.date}</div>
                <div className="mt-2 text-[15px] font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                  <Link href={`/blog/${p.slug}`} className="transition hover:text-[#c4b8ff]">
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
          <div className="mt-6">
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-lg bg-[#7c6cff] px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-[#7c6cff]/25 transition hover:bg-[#8b7cff]"
            >
              View all posts
            </Link>
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
                {openFaq === idx ? (
                  <div className="border-t border-border px-4 pb-4 pt-1 text-sm leading-relaxed text-text2">{a}</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="saas-card mt-24 border-[#7c6cff]/25 bg-gradient-to-br from-[#7c6cff]/10 via-[#141420] to-[#141420] p-8 text-center sm:p-10">
          <h3 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Ready to run smarter marketing?
          </h3>
          <p className="mt-3 text-text2">Start free and launch your first weekly operating loop today.</p>
          <div className="mt-6">
            <Link
              href="/signup?plan=starter"
              className="inline-flex rounded-lg bg-[#b8ff6c] px-6 py-3 text-[15px] font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/20 hover:bg-[#c8ff7c]"
            >
              Start free trial
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

