import Link from "next/link";

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
    name: "Starter Sprint",
    monthly: 499,
    annual: 399,
    blurb: "A focused 2‑week sprint to ship clarity + assets.",
    bullets: [
      "Positioning + messaging refresh",
      "1 landing page (copy + structure)",
      "4–6 content pieces (edits + templates)",
      "Weekly review + next steps"
    ],
    cta: "Request Starter Sprint"
  },
  {
    plan: "growth",
    name: "Growth Retainer",
    monthly: 1499,
    annual: 1299,
    blurb: "Ongoing weekly creative shipping for consistent momentum.",
    bullets: [
      "Weekly creative batch (ads + content)",
      "Landing page iteration",
      "Messaging & offer refinement",
      "Reporting + testing plan"
    ],
    cta: "Request Growth Retainer"
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    monthly: 2999,
    annual: 2699,
    blurb: "For multi-channel execution with deeper strategy + volume.",
    bullets: [
      "Multi-channel creative pipeline",
      "Website + funnel optimization",
      "Higher output volume + variants",
      "Priority turnaround"
    ],
    cta: "Contact us"
  }
];

const MATRIX = [
  { group: "Core", rows: [["Strategy-led creative", true, true, true]] },
  {
    group: "Delivery",
    rows: [
      ["Weekly cadence", true, true, true],
      ["Performance creative variants", false, true, true]
    ]
  },
  {
    group: "Web",
    rows: [
      ["Landing pages", true, true, true],
      ["Website optimization", false, true, true]
    ]
  },
  {
    group: "Support",
    rows: [
      ["Email support", true, true, true],
      ["Priority turnaround", false, true, true],
      ["Dedicated planning", false, false, true]
    ]
  }
] as const;

function Check({ ok }: { ok: boolean }) {
  return ok ? <span className="text-[#b8ff6c]">✓</span> : <span className="text-[#5c6278]">—</span>;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]">
      <header className="border-b border-[#2a2e3f] bg-[#08080c]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-7 w-7 rounded-lg bg-[#7c6cff]/25 ring-1 ring-[#7c6cff]/40" />
            Orah Tech & Marketing
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#9090b0] md:flex">
            <Link href="/services">Services</Link>
            <Link href="/work">Work</Link>
            <Link href="/about">About</Link>
            <Link href="/pricing" className="text-[#f0f0f8]">
              Pricing
            </Link>
            <Link href="/contact">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/contact"
              className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm font-medium text-black"
            >
              Get a proposal
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-12">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <h1 className="text-5xl leading-tight md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
              Simple packages for teams that want to ship.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[#9090b0]">
              Clear scope, weekly cadence, and creative aligned to your funnel. Start with a sprint, then retain for
              consistent output.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
            <div className="text-sm text-[#f0f0f8]">Plan notes</div>
            <ul className="mt-2 space-y-1">
              <li>- Starter Sprint is best for fast clarity + initial assets.</li>
              <li>- Growth Retainer is for consistent weekly shipping.</li>
              <li>- Enterprise adds volume + deeper funnel optimization.</li>
            </ul>
          </div>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.plan} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
              <div className="flex items-center justify-between">
                <div className="text-lg">{p.name}</div>
                {p.plan === "growth" ? (
                  <span className="rounded-full bg-[#7c6cff]/20 px-2 py-1 text-xs text-[#c4b8ff]">Most popular</span>
                ) : null}
              </div>
              <div className="mt-2 text-sm text-[#9090b0]">{p.blurb}</div>
              <div className="mt-5 flex items-end gap-2">
                <div className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                  ${p.monthly}
                </div>
                <div className="pb-1 text-sm text-[#9090b0]">/ month</div>
              </div>
              <div className="mt-1 text-xs text-[#707090]">or ${p.annual}/mo billed annually</div>
              <ul className="mt-4 space-y-2 text-sm text-[#9090b0]">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#7c6cff]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Link
                  href="/contact"
                  className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium ${
                    p.plan === "growth"
                      ? "bg-[#b8ff6c] text-black"
                      : "border border-[#2a2e3f] bg-black/20 text-[#f0f0f8] hover:bg-white/5"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          <div className="text-lg text-[#f0f0f8]">Compare plans</div>
          <div className="mt-2 text-sm text-[#9090b0]">
            Simple packaging: workflow velocity + governance, not feature bloat.
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-[#2a2e3f] text-[10px] font-medium uppercase text-[#9090b0]">
                <tr>
                  <th className="py-3 pr-4">Feature</th>
                  <th className="py-3 pr-4">Starter</th>
                  <th className="py-3 pr-4">Growth</th>
                  <th className="py-3">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-[#f0f0f8]">
                {MATRIX.flatMap((g) => [
                  <tr key={g.group} className="border-t border-[#2a2e3f]">
                    <td className="py-3 pr-4 text-xs font-semibold text-[#c4b8ff]" colSpan={4}>
                      {g.group}
                    </td>
                  </tr>,
                  ...g.rows.map((r) => (
                    <tr key={`${g.group}-${r[0]}`} className="border-t border-[#2a2e3f]">
                      <td className="py-3 pr-4 text-[#9090b0]">{r[0]}</td>
                      <td className="py-3 pr-4">
                        {typeof r[1] === "boolean" ? <Check ok={r[1]} /> : <span className="text-[#9090b0]">{r[1]}</span>}
                      </td>
                      <td className="py-3 pr-4">
                        {typeof r[2] === "boolean" ? <Check ok={r[2]} /> : <span className="text-[#9090b0]">{r[2]}</span>}
                      </td>
                      <td className="py-3">
                        {typeof r[3] === "boolean" ? <Check ok={r[3]} /> : <span className="text-[#9090b0]">{r[3]}</span>}
                      </td>
                    </tr>
                  ))
                ])}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
            <div className="text-lg text-[#f0f0f8]">FAQ</div>
            <div className="mt-3 space-y-3 text-sm text-[#9090b0]">
              <div>
                <div className="text-[#f0f0f8]">Do you work in sprints or retainers?</div>
                <div className="mt-1">
                  Both. Many clients start with a 2‑week sprint, then move to a retainer for ongoing weekly shipping and
                  iteration.
                </div>
              </div>
              <div>
                <div className="text-[#f0f0f8]">What do you need from us?</div>
                <div className="mt-1">Access to current assets, a point-of-contact, and clear goals for the next 30 days.</div>
              </div>
              <div>
                <div className="text-[#f0f0f8]">Can you work with our existing brand?</div>
                <div className="mt-1">
                  Yes. We can refine and extend what you have, or create a lightweight system that’s easier to apply across
                  content and ads.
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
            <div className="text-lg text-[#f0f0f8]">Ready to see it in action?</div>
            <div className="mt-2 text-sm text-[#9090b0]">
              Tell us what you’re selling and who it’s for. We’ll reply with a recommended first sprint.
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/contact" className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black">
                Get a proposal
              </Link>
              <Link href="/services" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                View services
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

