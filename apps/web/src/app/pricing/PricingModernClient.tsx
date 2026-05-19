"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { APP_URL } from "@/lib/appUrl";
import { marketingPlanPrices, MAX_SELF_SERVE_LIST_PRICE_USD } from "@/lib/marketingPricing";

type Plan = "starter" | "growth" | "enterprise";

const PLANS: Array<{
  plan: Plan;
  name: string;
  monthly: number;
  annual: number;
  blurb: string;
  bullets: string[];
  cta: string;
}> = [
  {
    plan: "starter",
    name: "Starter",
    monthly: marketingPlanPrices.starter.monthly,
    annual: marketingPlanPrices.starter.annualMonthlyEquivalent,
    blurb: "For solo operators and early PMM foundations.",
    bullets: ["All modules included", "100 AI workflow runs / month", "1 seat · up to 2 products", "Email support"],
    cta: "Start with Starter"
  },
  {
    plan: "growth",
    name: "Growth",
    monthly: marketingPlanPrices.growth.monthly,
    annual: marketingPlanPrices.growth.annualMonthlyEquivalent,
    blurb: "For teams shipping launches weekly.",
    bullets: ["All modules included", "Unlimited AI workflow runs", "3 seats · up to 10 products", "Priority support"],
    cta: "Start with Growth"
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    monthly: marketingPlanPrices.enterprise.monthly,
    annual: marketingPlanPrices.enterprise.annualMonthlyEquivalent,
    blurb: "For multi-team GTM governance and scale. Need more than list price? Talk to sales.",
    bullets: [
      "All modules included",
      "Unlimited AI in-app; BYOK required",
      "5 seats · up to 30 products",
      "Dedicated onboarding + success"
    ],
    cta: "Talk to sales"
  }
];

const MATRIX = [
  { group: "Core workflow", rows: [["Marketing Workbench (unified workbench)", true, true, true]] },
  { group: "Modules", rows: [["All dashboard modules (18+)", true, true, true]] },
  { group: "Workspace", rows: [["Team seats (members + invites)", "1", "3", "5"], ["Products per workspace", "Up to 2", "Up to 10", "Up to 30"]] },
  {
    group: "AI",
    rows: [
      ["AI workflow runs", "100/mo", "Unlimited", "Unlimited"],
      ["Anthropic: optional platform key (if operator enables)", true, true, false],
      ["Anthropic: bring your own workspace key (BYOK)", true, true, true]
    ]
  },
  { group: "Support", rows: [["Email support", true, true, true], ["Priority support", false, true, true], ["Dedicated onboarding", false, false, true]] }
] as const;

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="saas-kicker">
      <span className="saas-kicker-dot" />
      {children}
    </div>
  );
}

function Check({ ok }: { ok: boolean }) {
  return ok ? <span className="text-teal">✓</span> : <span className="text-text3">—</span>;
}

export function PricingModernClient() {
  const [annual, setAnnual] = useState(false);

  const headlinePrice = useMemo(() => (annual ? "Annual billing (~20% off)" : "Monthly billing"), [annual]);

  return (
    <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">
      <div className="grid gap-8 pt-10 lg:grid-cols-2 lg:items-end">
        <div>
          <Kicker>Pricing</Kicker>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.06] tracking-tight text-text md:text-5xl lg:text-[3.25rem]" style={{ fontFamily: "var(--font-heading)" }}>
            Plans that scale with your GTM motion
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
            Every plan includes every module. Tiers differ by AI volume, seats, products, support, and how Anthropic is connected.
          </p>
          <button
            type="button"
            onClick={() => setAnnual((v) => !v)}
            className="mt-6 inline-flex rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text2 transition hover:bg-surface3"
          >
            {headlinePrice}
          </button>
        </div>

        <div className="saas-gradient-border">
          <div className="saas-gradient-inner p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[13px] font-semibold uppercase tracking-wider text-primary">At a glance</div>
              <div className="rounded-full border border-border bg-surface2 px-3 py-1 text-[12px] font-medium text-text2">All modules included</div>
            </div>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-text2">
              {[
                "Starter is perfect for proving value fast.",
                "Growth removes AI limits for workflow velocity.",
                `Enterprise lists up to $${MAX_SELF_SERVE_LIST_PRICE_USD}/mo; above that, talk to sales.`
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`${APP_URL}/signup?plan=growth`} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark">
                Start free
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3">
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Competitor comparison banner */}
      <div className="mt-8 rounded-2xl border border-amber/30 bg-amber/5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-amber-600">Pricing transparency</div>
            <div className="mt-1 text-lg font-semibold text-text">Most tools charge per product. We charge per workspace.</div>
            <p className="mt-2 text-sm text-text2">
              Competitors price at $199–$399/product/month. For a team with 2 products, that&apos;s $398–$798/mo before AI costs.
              Our Growth plan is <span className="font-semibold text-text">$299/mo for the entire workspace</span> — all products, unlimited AI, 3 seats.
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-border bg-surface p-4 text-center">
            <div className="font-mono text-2xl font-bold text-primary">$299</div>
            <div className="mt-1 text-xs text-text2">vs $798+/mo</div>
            <div className="mt-1 text-[11px] text-text3">per workspace / per product</div>
          </div>
        </div>
      </div>

      <section className="mt-12 saas-bento">
        {PLANS.map((p) => (
          <div
            key={p.plan}
            className={`saas-bento-card saas-bento-card-hover flex flex-col p-6 ${p.plan === "growth" ? "md:col-span-4 border-primary/35 ring-1 ring-primary/20" : "md:col-span-4"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-lg font-semibold text-text">{p.name}</div>
              {p.plan === "growth" ? (
                <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-dark">
                  Popular
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-sm text-text2">{p.blurb}</div>
            <div className="mt-6 flex items-end gap-1" style={{ fontFamily: "var(--font-heading)" }}>
              <span className="text-4xl font-semibold tracking-tight text-text">${annual ? p.annual : p.monthly}</span>
              <span className="pb-1 text-sm text-text2">/ mo</span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-text3">{annual ? "billed annually" : `or $${p.annual}/mo billed annually`}</div>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-text2">
              {p.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link
                href={p.plan === "enterprise" ? "/contact" : `${APP_URL}/signup?plan=${p.plan}`}
                className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  p.plan === "growth" ? "bg-amber text-heading shadow-lg shadow-card hover:bg-amber-hover" : "border border-border bg-surface2 text-text hover:bg-surface3"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          </div>
        ))}
      </section>

      <section className="saas-card mt-14 overflow-hidden p-0">
        <div className="border-b border-border px-6 py-5 sm:px-8">
          <div className="text-lg font-semibold text-text">Compare plans</div>
          <div className="mt-1 text-sm text-text2">Same modules everywhere — tiers differ by AI volume, seats, products, and support.</div>
        </div>
        <div className="overflow-x-auto px-2 pb-4 sm:px-4">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-border text-[10px] font-semibold uppercase tracking-[0.12em] text-text2">
              <tr>
                <th className="py-4 pl-4 pr-4">Feature</th>
                <th className="py-4 pr-4">Starter</th>
                <th className="py-4 pr-4">Growth</th>
                <th className="py-4 pr-4">Enterprise</th>
              </tr>
            </thead>
            <tbody className="text-text">
              {MATRIX.flatMap((g) => [
                <tr key={g.group} className="border-t border-border bg-surface2">
                  <td className="py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wider text-primary" colSpan={4}>
                    {g.group}
                  </td>
                </tr>,
                ...g.rows.map((r) => (
                  <tr key={`${g.group}-${r[0]}`} className="border-t border-border">
                    <td className="py-3.5 pl-4 pr-4 text-text2">{r[0]}</td>
                    <td className="py-3.5 pr-4">{typeof r[1] === "boolean" ? <Check ok={r[1]} /> : <span className="text-text2">{r[1]}</span>}</td>
                    <td className="py-3.5 pr-4">{typeof r[2] === "boolean" ? <Check ok={r[2]} /> : <span className="text-text2">{r[2]}</span>}</td>
                    <td className="py-3.5 pr-4">{typeof r[3] === "boolean" ? <Check ok={r[3]} /> : <span className="text-text2">{r[3]}</span>}</td>
                  </tr>
                ))
              ])}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14 saas-card p-6 sm:p-8">
        <div className="text-lg font-semibold text-text">What makes us different</div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["No per-product charges", "One workspace price covers all your products. Scale products without scaling your bill."],
            ["No research run limits", "Growth and Enterprise get unlimited AI workflow runs — no throttling on segments, positioning, or content."],
            ["All 18 modules included", "Every plan includes every module. No paywalls, no add-ons, no upgrade gates mid-workflow."],
            ["Self-serve in 60 seconds", "No demo required. Sign up, add a product brief, and generate your first ICP segments immediately."]
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-surface2 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-teal">✓</span>
                <div>
                  <div className="text-[13px] font-semibold text-text">{t}</div>
                  <div className="mt-1 text-[13px] leading-relaxed text-text2">{d}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
