import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

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
    monthly: 49,
    annual: 39,
    blurb: "For solo operators and early PMM foundations.",
    bullets: [
      "100 AI workflow runs / month",
      "All core workbenches (ICP → Positioning → Messaging)",
      "Marketing Workbench (unified workbench)",
      "Email support"
    ],
    cta: "Start with Starter"
  },
  {
    plan: "growth",
    name: "Growth",
    monthly: 99,
    annual: 79,
    blurb: "For teams shipping campaigns weekly.",
    bullets: [
      "Unlimited AI workflow runs",
      "All modules (Events, Content Studio, Battlecards, etc.)",
      "Priority support",
      "Team-ready workflows + templates"
    ],
    cta: "Start with Growth"
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    monthly: 299,
    annual: 249,
    blurb: "For multi-team GTM governance and scale.",
    bullets: [
      "Unlimited AI + governance patterns",
      "Advanced controls (SSO later), audit-friendly workflows",
      "Dedicated success + onboarding",
      "Custom security review"
    ],
    cta: "Talk to sales"
  }
];

const MATRIX = [
  { group: "Core workflow", rows: [["Marketing Workbench (unified workbench)", true, true, true]] },
  {
    group: "AI",
    rows: [
      ["AI workflow runs", "100/mo", "Unlimited", "Unlimited"],
      ["Use your own Anthropic key", true, true, true]
    ]
  },
  {
    group: "Templates & workflows",
    rows: [
      ["Getting started + template library", true, true, true],
      ["Workflow run logs", true, true, true],
      ["Team governance patterns", false, true, true]
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
                Enterprise is for governance + onboarding at scale.
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

        <section className="saas-card mt-14 overflow-hidden p-0 sm:p-0">
          <div className="border-b border-border px-6 py-5 sm:px-8">
            <div className="text-lg font-semibold text-text">Compare plans</div>
            <div className="mt-1 text-sm text-text2">
              Workflow velocity + governance — not feature bloat.
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
                <div className="font-medium text-text">Do I need to add an Anthropic key?</div>
                <div className="mt-2">
                  You can bring your own key. Starter includes limited workflow runs; Growth and Enterprise are
                  unlimited.
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
