import type { Metadata } from "next";
import Link from "next/link";
import { getAllContent } from "@/lib/content";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "AI Marketing Workbench vs Competitors — Tool Comparisons for B2B Marketing Teams",
  description:
    "How AI Marketing Workbench compares to Notion, HubSpot, Jasper, Airtable, Crayon, Klue, and other tools B2B marketing teams use. Find out which tool fits which job.",
  alternates: { canonical: "/vs" },
  openGraph: {
    title: "AI Marketing Workbench vs Competitors",
    description:
      "Compare AI Marketing Workbench to the tools B2B marketing teams use — Notion, HubSpot, Jasper, Airtable, Crayon, Klue, and more.",
    type: "website",
    url: "/vs",
    images: [{ url: "/og?title=AI+Marketing+Workbench+vs+Competitors&description=Tool+comparisons+for+B2B+marketing+teams&type=vs", width: 1200, height: 630 }]
  },
  twitter: { card: "summary_large_image" }
};

export default async function VsIndexPage() {
  const pages = await getAllContent("vs");

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[360px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-4xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
            Comparisons
          </div>
          <h1
            className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-text sm:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            AI Marketing Workbench vs Other Tools
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-text2">
            B2B marketing teams use a lot of tools. Here is how AI Marketing Workbench compares — what it does that others don&apos;t, and what it doesn&apos;t try to replace.
          </p>
        </div>

        <section className="mt-14">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((p) => (
              <Link
                key={p.slug}
                href={`/vs/${p.slug}`}
                className="group saas-card flex flex-col p-5 transition hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] font-semibold text-text3">
                    vs {p.competitor}
                  </span>
                  <span className="text-text3 transition group-hover:text-primary">→</span>
                </div>
                <div className="mt-3 text-[15px] font-semibold text-text group-hover:text-primary">
                  {p.title}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-text2 line-clamp-3">{p.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 saas-card p-8">
          <div className="text-center">
            <div className="text-lg font-semibold text-text">The marketing OS that connects strategy to execution</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text2">
              AI Marketing Workbench sits between your strategy tools and your execution tools — connecting ICP, positioning, messaging, campaigns, and analytics in one place.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup?plan=starter"
                className="rounded-lg bg-amber px-5 py-2.5 text-[13px] font-semibold text-heading shadow-card transition hover:bg-amber-hover"
              >
                Start free
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-border bg-surface2 px-5 py-2.5 text-[13px] font-medium text-text transition hover:bg-surface3"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
