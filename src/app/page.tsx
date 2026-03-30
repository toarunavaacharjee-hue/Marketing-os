"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  ["Do I need a technical team?", "No. Marketing OS is designed for operators and founders first. A developer helps only for deeper integrations."],
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
        bullets: ["100 AI workflow runs / month", "Core PMM spine", "All work workbench"]
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
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]" style={{ fontFamily: "var(--font-body)" }}>
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

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#2a2e3f] bg-[#08080c]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-7 w-7 rounded-lg bg-[#7c6cff]/25 ring-1 ring-[#7c6cff]/40" />
            Marketing OS
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[#9090b0] md:flex">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#modules">Modules</a>
            <Link href="/pricing">Pricing</Link>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#2a2e3f] bg-transparent px-3 py-2 text-sm hover:bg-white/5"
            >
              View demo
            </Link>
            <Link href="/signup?plan=starter" className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm font-medium text-black">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24">
        <section data-reveal className="grid gap-8 pt-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-5xl leading-tight md:text-6xl" style={{ fontFamily: "var(--font-heading)" }}>
              The PMM + GTM operating layer for teams that ship.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[#9090b0]">
              Marketing OS connects ICP, positioning, messaging, campaigns, and measurement loops — then turns them into
              repeatable workflows. It’s not a CRM replacement; it’s the system that keeps your go-to-market coherent.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup?plan=starter" className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black">
                Start free
              </Link>
              <Link href="/pricing" className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5">
                See pricing
              </Link>
              <Link
                href="/dashboard/getting-started"
                className="rounded-xl border border-[#2a2e3f] px-5 py-3 font-medium hover:bg-white/5"
              >
                Getting started
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4 rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-[#7c6cff]" />
                <div className="h-8 w-8 rounded-full bg-[#b8ff6c]" />
                <div className="h-8 w-8 rounded-full bg-[#2a2e3f]" />
              </div>
              <div className="text-[#9090b0]">Trusted by <span className="text-[#f0f0f8]">120+ growth teams</span></div>
              <div className="text-[#9090b0]">Avg setup <span className="text-[#f0f0f8]">1.8 hours</span></div>
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
            <div className="mb-3 flex items-center gap-2 text-xs text-[#9090b0]">
              <span className="h-2 w-2 rounded-full bg-[#7c6cff]" />
              <span className="h-2 w-2 rounded-full bg-[#b8ff6c]" />
              <span className="h-2 w-2 rounded-full bg-[#2a2e3f]" />
              pm.mktos.app — workbench preview
            </div>
            <div className="rounded-xl border border-[#2a2e3f] bg-black/20 p-4">
              <div className="text-sm text-[#f0f0f8]">What you get on day 1</div>
              <div className="mt-3 grid gap-2 text-sm text-[#9090b0]">
                {[
                  "Templates to seed launch plans and event playbooks",
                  "All work: a unified workbench across modules",
                  "AI actions: Segment → Messaging draft, Positioning → Pitch battlecard",
                  "Workflow run logs + updates so teams stay aligned"
                ].map((x) => (
                  <div key={x} className="rounded-lg border border-[#2a2e3f] bg-[#141420]/60 px-3 py-2">
                    {x}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/dashboard/work" className="rounded-xl bg-[#7c6cff] px-4 py-2 text-sm font-medium text-white">
                  Explore All work
                </Link>
                <Link
                  href="/dashboard/getting-started"
                  className="rounded-xl border border-[#2a2e3f] px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
                >
                  Apply templates
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="features" data-reveal className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>Features</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-5 md:col-span-2">
              <div className="text-lg">AI Copilot</div>
              <p className="mt-2 text-sm text-[#9090b0]">Ask strategic questions, get tactical action plans, and run follow-ups instantly.</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                {["Response time: 8s", "Weekly plans: 24", "Query success: 96%"].map((m) => (
                  <div key={m} className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-[#9090b0]">{m}</div>
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
              <div key={f} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-5">
                <div className="text-base">{f}</div>
                <p className="mt-2 text-sm text-[#9090b0]">Built for high-velocity GTM teams that need clarity and execution speed.</p>
              </div>
            ))}
          </div>
        </section>

        <section id="modules" data-reveal className="mt-20 rounded-3xl border border-[#2a2e3f] bg-[#141420] p-6">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>All 18 Modules</h2>
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

        <section id="how-it-works" data-reveal className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>How It Works</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              "Define ICP segments and priorities",
              "Generate and refine positioning + messaging",
              "Seed plans using templates + workflows",
              "Track work + outcomes weekly"
            ].map((s, i) => (
              <div key={s} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
                <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#7c6cff] text-xs font-semibold">{i + 1}</div>
                <p className="text-sm text-[#9090b0]">{s}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" data-reveal className="mt-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>Pricing</h2>
            <button
              onClick={() => setAnnual((v) => !v)}
              className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#9090b0]"
            >
              {annual ? "Annual billing (save ~20%)" : "Monthly billing"}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {pricing.map((p) => (
              <div key={p.name} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-5">
                <div className="text-lg">{p.name}</div>
                <div className="mt-2 text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                  ${annual ? p.a : p.m}
                  <span className="text-base text-[#9090b0]">/mo</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-[#9090b0]">
                  {p.bullets.map((b) => <li key={b}>- {b}</li>)}
                </ul>
                <div className="mt-4 grid gap-2">
                  <Link
                    href={`/signup?plan=${p.name.toLowerCase()}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#b8ff6c] px-4 py-3 text-sm font-medium text-black"
                  >
                    Choose {p.name}
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-[#2a2e3f] px-4 py-3 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
                  >
                    Compare plans
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>Testimonials</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["VP Marketing, B2B SaaS", "We replaced six tools and cut campaign planning time by 40%."],
              ["Growth Lead, PLG startup", "Copilot gives us usable actions, not generic AI fluff."],
              ["Founder, MarTech agency", "Our team ships better content and clearer GTM plans every week."]
            ].map(([role, quote]) => (
              <div key={role} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-5">
                <p className="text-sm text-[#f0f0f8]">"{quote}"</p>
                <p className="mt-3 text-xs text-[#9090b0]">{role}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" data-reveal className="mt-20">
          <h2 className="text-3xl" style={{ fontFamily: "var(--font-heading)" }}>FAQ</h2>
          <div className="mt-5 space-y-2">
            {faq.map(([q, a], idx) => (
              <div key={q} className="rounded-xl border border-[#2a2e3f] bg-[#141420]">
                <button
                  onClick={() => setOpenFaq((v) => (v === idx ? -1 : idx))}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span>{q}</span>
                  <span className="text-[#9090b0]">{openFaq === idx ? "−" : "+"}</span>
                </button>
                {openFaq === idx ? <div className="px-4 pb-4 text-sm text-[#9090b0]">{a}</div> : null}
              </div>
            ))}
          </div>
        </section>

        <section data-reveal className="mt-20 rounded-3xl border border-[#7c6cff]/30 bg-[#141420] p-8 text-center">
          <h3 className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>Ready to run smarter marketing?</h3>
          <p className="mt-3 text-[#9090b0]">Start free, launch your first weekly operating loop today.</p>
          <div className="mt-5">
            <Link href="/signup?plan=starter" className="rounded-xl bg-[#b8ff6c] px-5 py-3 font-medium text-black">Start free trial</Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2a2e3f]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
          <div><div className="font-semibold">Marketing OS</div><p className="mt-2 text-sm text-[#9090b0]">The operating system for modern GTM teams.</p></div>
          <div className="text-sm text-[#9090b0]"><div className="mb-2 text-[#f0f0f8]">Product</div><div>Features</div><div>Modules</div><div>Pricing</div></div>
          <div className="text-sm text-[#9090b0]"><div className="mb-2 text-[#f0f0f8]">Company</div><div>About</div><div>Careers</div><div>Contact</div></div>
          <div className="text-sm text-[#9090b0]"><div className="mb-2 text-[#f0f0f8]">Resources</div><div>Docs</div><div>FAQ</div><div>Status</div></div>
        </div>
      </footer>
    </div>
  );
}

