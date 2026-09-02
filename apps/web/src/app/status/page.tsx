import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Status",
  description: "Service status for AI Marketing Workbench.",
  alternates: { canonical: "/status" }
};

const systems = [
  { name: "Web app", status: "Operational" },
  { name: "API", status: "Operational" },
  { name: "Auth", status: "Operational" },
  { name: "Background workers", status: "Operational" }
];

export default function StatusPage() {
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
            Status
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">Current health and incident updates.</p>
        </header>

        <section className="mt-10 saas-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-text">Overall</div>
              <div className="mt-1 text-2xl font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                All systems operational
              </div>
            </div>
            <span className="rounded-full bg-teal/10 px-3 py-1 text-[12px] font-semibold text-teal ring-1 ring-teal/25">
              Operational
            </span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {systems.map((s) => (
              <div key={s.name} className="saas-card2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-text">{s.name}</div>
                  <div className="text-[12px] font-medium text-text2">{s.status}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-sm text-text2">
            For incidents or support, email{" "}
            <a className="underline decoration-border underline-offset-4 hover:text-text" href="mailto:orahtechandmarketing@gmail.com">
              orahtechandmarketing@gmail.com
            </a>
            .
          </div>
        </section>

        <section className="mt-6 saas-card p-6">
          <div className="text-sm font-semibold text-text">Prefer a dedicated status page provider?</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">
            If you’re using Statuspage/Better Stack, we can link this page to your official status URL.
          </p>
          <div className="mt-4">
            <Link
              href="/contact"
              className="saas-btn saas-btn-secondary px-4 py-2 text-[13px]"
            >
              Contact us
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

