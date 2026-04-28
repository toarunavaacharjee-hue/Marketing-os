import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Resources",
  description: "Docs, product updates, and resources for AI Marketing Workbench."
};

export default function ResourcesPage() {
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
            Resources
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
            Everything you need to evaluate, learn, and stay up to date.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["/docs", "Docs", "Guides and workflows to get value fast."],
            ["/blog", "Blog", "Frameworks, templates, and GTM playbooks."],
            ["/status", "Status", "Service health and incident updates."]
          ].map(([href, label, desc]) => (
            <Link key={href} href={href} className="saas-card saas-card-hover block p-6">
              <div className="text-lg font-semibold text-text" style={{ fontFamily: "var(--font-heading)" }}>
                {label}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-text2">{desc}</div>
              <div className="mt-4 text-[13px] font-medium text-[#c4b8ff]">Open →</div>
            </Link>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

