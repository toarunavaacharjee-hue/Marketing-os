"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

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
  ["Does AI usage have limits?", "Starter includes 100 AI queries/month. Growth and Enterprise include unlimited queries."],
  ["Can we use our own Anthropic key?", "Yes. Each user can store their API key and run AI features in Copilot and module generators."],
  ["Is there a contract?", "Starter and Growth are month-to-month. Enterprise can be monthly or annual with custom terms."]
];

export default function HomePage() {
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
        m: 49,
        a: 39,
        bullets: ["100 AI workflow runs / month", "Core PMM spine", "Marketing Workbench"]
      },
      { name: "Growth", m: 99, a: 79, bullets: ["Unlimited AI workflow runs", "All modules", "Priority support"] },
      {
        name: "Enterprise",
        m: 299,
        a: 249,
        bullets: ["Unlimited AI + governance patterns", "Operator-friendly controls", "Dedicated success"]
      }
    ],
    []
  );

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
              className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-[#fafafc] md:text-5xl lg:text-[3.25rem]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              AI Marketing Workbench
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#9090b0]">
              The PMM + GTM operating layer (not a CRM). Connect ICP, positioning, messaging, campaigns, and measurement
              loops — then turn them into repeatable workflows.
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
                className="inline-flex items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] px-5 py-3 text-[15px] font-medium text-[#e8e8f0] transition hover:border-white/[0.14] hover:bg-white/[0.07]"
              >
                See pricing
              </Link>
              <Link
                href="/dashboard/getting-started"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-5 py-3 text-[15px] font-medium text-text2 transition hover:bg-surface3 hover:text-text"
              >
                Getting started
              </Link>
            </div>
            <div className="saas-card mt-8 flex flex-wrap items-center gap-5 px-5 py-4 text-sm">
              <div className="flex -space-x-2">
                <div className="h-9 w-9 rounded-full border-2 border-[#141420] bg-gradient-to-br from-[#7c6cff] to-[#5a4fd4]" />
                <div className="h-9 w-9 rounded-full border-2 border-[#141420] bg-[#b8ff6c]" />
                <div className="h-9 w-9 rounded-full border-2 border-[#141420] bg-[#2a2e3f]" />
              </div>
              <div className="h-8 w-px bg-white/[0.08]" />
              <div className="text-text2">
                Trusted by <span className="font-medium text-text">120+ growth teams</span>
              </div>
              <div className="hidden h-8 w-px bg-white/[0.08] sm:block" />
              <div className="text-text2">
                Avg setup <span className="font-mono text-text">1.8h</span>
              </div>
            </div>
          </div>
          <div className="saas-card saas-card-hover p-6 sm:p-7">
            <div className="mb-4 flex items-center gap-2 border-b border-white/[0.06] pb-4 font-mono text-[11px] text-[#707090]">
              <span className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="ml-2 truncate">app — Marketing Workbench</span>
            </div>
            <div className="rounded-xl border border-border bg-surface2 p-4 shadow-inner">
              <div className="text-sm font-medium text-text">What you get on day 1</div>
              <div className="mt-3 grid gap-2 text-sm text-[#9090b0]">
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
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#fafafc] md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Built for modern GTM teams
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="saas-card saas-card-hover p-6 md:col-span-2">
              <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wider text-[#7c6cff]">AI Copilot</div>
              <div className="mt-2 text-lg font-medium text-text">Strategic answers, shipped as actions</div>
              <p className="mt-2 text-sm leading-relaxed text-[#9090b0]">
                Ask strategic questions, get tactical action plans, and run follow-ups instantly.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[12px]">
                {["Response ~8s", "Weekly plans: 24", "Success: 96%"].map((m) => (
                  <div key={m} className="rounded-lg border border-white/[0.06] bg-[#0c0c12] px-2 py-3 font-mono text-[#9090b0]">
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
                <p className="mt-2 text-sm leading-relaxed text-[#9090b0]">
                  Built for high-velocity GTM teams that need clarity and execution speed.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="modules" data-reveal className="saas-card mt-24 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-[#fafafc] md:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
            All 18 modules
          </h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {modules.map(([name, cat]) => (
              <div key={name} className={`rounded-xl border p-3 text-sm ${
                cat === "Core" ? "border-[#7c6cff]/40 bg-[#7c6cff]/10" :
                cat === "Strategy" ? "border-[#2a2e3f] bg-[#1e1e2e]" :
                cat === "Execution" ? "border-[#2a2e3f] bg-black/20" :
                cat === "Content" ? "border-[#2a2e3f] bg-[#141420]" :
                cat === "Sales" ? "border-[#b8ff6c]/30 bg-[#b8ff6c]/10" :
                "border-[#2a2e3f] bg-[#1a1a28]"
              }`}>
                <div>{name}</div>
                <div className="mt-1 text-xs text-[#9090b0]">{cat}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" data-reveal className="mt-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Workflow</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#fafafc] md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
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
                <p className="text-sm leading-relaxed text-[#9090b0]">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" data-reveal className="mt-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Pricing</div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#fafafc] md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                Simple plans
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setAnnual((v) => !v)}
              className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-[#9090b0] transition hover:bg-white/[0.07]"
            >
              {annual ? "Annual billing (~20% off)" : "Monthly billing"}
            </button>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {pricing.map((p) => (
              <div key={p.name} className="saas-card saas-card-hover flex flex-col p-6">
                <div className="text-base font-semibold text-text">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                  <span className="text-4xl font-semibold tracking-tight text-[#fafafc]">${annual ? p.a : p.m}</span>
                  <span className="text-sm text-[#9090b0]">/mo</span>
                </div>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-[#9090b0]">
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
        </section>

        <section data-reveal className="mt-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5c6278]">Social proof</div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#fafafc] md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Teams shipping faster
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["VP Marketing, B2B SaaS", "We replaced six tools and cut campaign planning time by 40%."],
              ["Growth Lead, PLG startup", "Copilot gives us usable actions, not generic AI fluff."],
              ["Founder, MarTech agency", "Our team ships better content and clearer GTM plans every week."]
            ].map(([role, quote]) => (
              <div key={role} className="saas-card saas-card-hover p-5">
                <p className="text-sm leading-relaxed text-[#e8e8f0]">&ldquo;{quote}&rdquo;</p>
                <p className="mt-4 text-[12px] font-medium uppercase tracking-wider text-[#707090]">{role}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" data-reveal className="mt-24">
          <h2 className="text-3xl font-semibold tracking-tight text-[#fafafc] md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            FAQ
          </h2>
          <div className="mt-6 space-y-2">
            {faq.map(([q, a], idx) => (
              <div key={q} className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#141420]">
                <button
                  type="button"
                  onClick={() => setOpenFaq((v) => (v === idx ? -1 : idx))}
                  className="flex w-full items-center justify-between px-4 py-4 text-left text-[15px] font-medium text-text transition hover:bg-surface2"
                >
                  <span>{q}</span>
                  <span className="ml-2 font-mono text-[#9090b0]">{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx ? (
                  <div className="border-t border-border px-4 pb-4 pt-1 text-sm leading-relaxed text-text2">{a}</div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="saas-card mt-24 border-[#7c6cff]/25 bg-gradient-to-br from-[#7c6cff]/10 via-[#141420] to-[#141420] p-8 text-center sm:p-10">
          <h3 className="text-2xl font-semibold tracking-tight text-[#fafafc] sm:text-3xl md:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Ready to run smarter marketing?
          </h3>
          <p className="mt-3 text-[#9090b0]">Start free and launch your first weekly operating loop today.</p>
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

