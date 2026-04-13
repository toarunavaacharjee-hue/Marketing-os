import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { marketingPlanPrices, MAX_SELF_SERVE_LIST_PRICE_USD } from "@/lib/marketingPricing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing | AI Marketing Workbench",
  description: "Simple plans for modern PMM & GTM teams: Starter, Growth, and Enterprise."
};

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
    bullets: [
      "Full platform — all modules included (same as higher tiers)",
      "100 AI workflow runs / month (unlimited on Growth+)",
      "1 team seat · up to 2 products",
      "Email support"
    ],
    cta: "Start with Starter"
  },
  {
    plan: "growth",
    name: "Growth",
    monthly: marketingPlanPrices.growth.monthly,
    annual: marketingPlanPrices.growth.annualMonthlyEquivalent,
    blurb: "For teams shipping campaigns weekly.",
    bullets: [
      "Unlimited AI workflow runs",
      "Up to 3 team seats · up to 10 products",
      "All modules included",
      "Priority support",
      "Team-ready workflows + templates"
    ],
    cta: "Start with Growth"
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    monthly: marketingPlanPrices.enterprise.monthly,
    annual: marketingPlanPrices.enterprise.annualMonthlyEquivalent,
    blurb:
      "For multi-team GTM governance and scale. List price caps on this page; need more — talk to sales.",
    bullets: [
      "Unlimited AI workflow runs in-app; with BYOK, Anthropic token usage is on your Anthropic bill (not included in list price)",
      "Up to 5 team seats and 30 products per workspace (hit either cap first; more via sales)",
      "Anthropic workspace key required — Enterprise cannot use the shared platform key",
      "Team roles & invites (owner, admin, member)",
      "SSO & audit-friendly workflows — on the roadmap; dedicated onboarding + success",
      "Security review scoped with sales"
    ],
    cta: "Talk to sales"
  }
];

const MATRIX = [
  { group: "Core workflow", rows: [["Marketing Workbench (unified workbench)", true, true, true]] },
  {
    group: "Modules",
    rows: [["All dashboard modules (18+)", true, true, true]]
  },
  {
    group: "Workspace",
    rows: [
      ["Team seats (members + invites)", "1", "3", "5"],
      ["Products per workspace", "Up to 2", "Up to 10", "Up to 30"]
    ]
  },
  {
    group: "AI",
    rows: [
      ["AI workflow runs", "100/mo", "Unlimited", "Unlimited"],
      ["Anthropic: optional platform key (if operator enables)", true, true, false],
      ["Anthropic: bring your own workspace key (BYOK)", true, true, true]
    ]
  },
  {
    group: "Templates & workflows",
    rows: [
      ["Getting started + template library", true, true, true],
      ["Workflow run logs", true, true, true],
      ["Multi-seat collaboration (invites + roles)", false, true, true]
    ]
  },
  {
    group: "Support",
    rows: [
      ["Email support", true, true, true],
      ["Priority support", false, true, true],
      ["Dedicated onboarding", false, false, true]
    ]
  }
] as const;

function Check({ ok }: { ok: boolean }) {
  return ok ? <span className="text-[#b8ff6c]">✓</span> : <span className="text-text3">—</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[400px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Pricing</div>
            <h1
              className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-text md:text-5xl lg:text-[3.25rem]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Plans that scale with your GTM motion
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
              The PMM + GTM operating layer (not a CRM). ICP, positioning, messaging, campaigns, and measurement loops —
              connected and actionable.
            </p>
          </div>
          <div className="saas-card p-5 sm:p-6">
            <div className="text-[13px] font-semibold uppercase tracking-wider text-[#7c6cff]">At a glance</div>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-text2">
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#b8ff6c]" />
                Starter is perfect for proving value fast.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#b8ff6c]" />
                Growth removes AI limits for workflow velocity.
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#b8ff6c]" />
                {`Enterprise lists up to $${MAX_SELF_SERVE_LIST_PRICE_USD}/mo; above that, talk to sales for custom terms.`}
              </li>
            </ul>
          </div>
        </div>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.plan}
              className={`saas-card saas-card-hover flex flex-col p-6 ${
                p.plan === "growth" ? "border-[#7c6cff]/35 ring-1 ring-[#7c6cff]/20" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold text-text">{p.name}</div>
                {p.plan === "growth" ? (
                  <span className="shrink-0 rounded-full bg-[#7c6cff]/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#c4b8ff]">
                    Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-sm text-text2">{p.blurb}</div>
              <div className="mt-6 flex items-end gap-1" style={{ fontFamily: "var(--font-heading)" }}>
                <span className="text-4xl font-semibold tracking-tight text-text">${p.monthly}</span>
                <span className="pb-1 text-sm text-text2">/ month</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-text3">or ${p.annual}/mo billed annually</div>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-text2">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#7c6cff]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href={p.plan === "enterprise" ? "/signup?plan=enterprise" : `/signup?plan=${p.plan}`}
                  className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    p.plan === "growth"
                      ? "bg-[#b8ff6c] text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 hover:bg-[#c8ff7c]"
                      : "border border-border bg-surface2 text-text hover:bg-surface3"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </section>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-text2">
          {`Published list prices top out at $${MAX_SELF_SERVE_LIST_PRICE_USD}/mo. Volume discounts, SSO, higher seat or product limits, or procurement-friendly terms — `}
          <Link href="/contact" className="font-medium text-accent2 hover:underline">
            talk to sales
          </Link>
          .
        </p>

        <section className="saas-card mt-14 overflow-hidden p-0 sm:p-0">
          <div className="border-b border-border px-6 py-5 sm:px-8">
            <div className="text-lg font-semibold text-text">Compare plans</div>
            <div className="mt-1 text-sm text-text2">
              Same modules everywhere — tiers differ by AI volume, seats, products, support, and how Anthropic is
              connected.
            </div>
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
                    <td className="py-3 pl-4 pr-4 text-xs font-semibold uppercase tracking-wider text-[#c4b8ff]" colSpan={4}>
                      {g.group}
                    </td>
                  </tr>,
                  ...g.rows.map((r) => (
                    <tr key={`${g.group}-${r[0]}`} className="border-t border-border">
                      <td className="py-3.5 pl-4 pr-4 text-text2">{r[0]}</td>
                      <td className="py-3.5 pr-4">
                        {typeof r[1] === "boolean" ? <Check ok={r[1]} /> : <span className="text-text2">{r[1]}</span>}
                      </td>
                      <td className="py-3.5 pr-4">
                        {typeof r[2] === "boolean" ? <Check ok={r[2]} /> : <span className="text-text2">{r[2]}</span>}
                      </td>
                      <td className="py-3.5 pr-4">
                        {typeof r[3] === "boolean" ? <Check ok={r[3]} /> : <span className="text-text2">{r[3]}</span>}
                      </td>
                    </tr>
                  ))
                ])}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-14 grid gap-4 lg:grid-cols-2">
          <div className="saas-card p-6 sm:p-8">
            <div className="text-lg font-semibold text-text">FAQ</div>
            <div className="mt-4 space-y-5 text-sm leading-relaxed text-text2">
              <div>
                <div className="font-medium text-text">Is this a CRM replacement?</div>
                <div className="mt-2">
                  No. AI Marketing Workbench is the PMM + GTM operating layer (not a CRM). It connects to systems like
                  GA4 and can integrate with CRMs, but it doesn’t try to own your pipeline.
                </div>
              </div>
              <div>
                <div className="font-medium text-text">Can I upgrade later?</div>
                <div className="mt-2">Yes — upgrade any time from Settings.</div>
              </div>
              <div>
                <div className="font-medium text-text">Are modules paywalled by plan?</div>
                <div className="mt-2">
                  No. Every plan includes the full module set. Starter is limited by AI workflow runs per month, product
                  slots, and seats — not by which modules you can open.
                </div>
              </div>
              <div>
                <div className="font-medium text-text">Do I need an Anthropic key? Does my plan include AI API cost?</div>
                <div className="mt-2">
                  <span className="font-medium text-text">Starter &amp; Growth:</span> you can use{" "}
                  <span className="font-medium text-text">platform AI</span> when your operator enables it, or add a{" "}
                  <span className="font-medium text-text">workspace key (BYOK)</span> so usage bills to your Anthropic
                  account. <span className="font-medium text-text">Enterprise</span> requires a workspace Anthropic key —
                  no shared platform key. Your subscription covers the Marketing Workbench app;{" "}
                  <span className="font-medium text-text">Anthropic token usage</span> is paid to Anthropic (or included in
                  your Anthropic contract), not folded into the prices shown here for BYOK workspaces.
                </div>
              </div>
              <div>
                <div className="font-medium text-text">What if we need more than the Enterprise list price?</div>
                <div className="mt-2">
                  {`Published list prices top out at $${MAX_SELF_SERVE_LIST_PRICE_USD}/mo. For larger rollouts, SSO, procurement, or custom limits, `}
                  <Link href="/contact" className="font-medium text-accent2 hover:underline">
                    talk to sales
                  </Link>
                  .
                </div>
              </div>
            </div>
          </div>
          <div className="saas-card flex flex-col justify-center bg-gradient-to-br from-[#7c6cff]/10 via-[color:var(--surface)] to-[color:var(--surface)] p-6 sm:p-8">
            <div className="text-lg font-semibold text-text">See it in action</div>
            <div className="mt-2 text-sm text-text2">
              Apply templates, run workflows, and ship your first GTM plan in one session.
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup?plan=growth" className="rounded-lg bg-[#b8ff6c] px-5 py-3 text-sm font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 hover:bg-[#c8ff7c]">
                Start free
              </Link>
              <Link href="/dashboard" className="rounded-lg border border-border bg-surface2 px-5 py-3 text-sm font-medium hover:bg-surface3">
                View demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
