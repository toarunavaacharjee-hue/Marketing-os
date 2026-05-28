import type { Metadata } from "next";
import Link from "next/link";
import { getAllContent } from "@/lib/content";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Free PMM Templates",
  description:
    "Free product marketing templates — messaging frameworks, positioning statements, ICP definitions, GTM checklists, battlecards, and more. Copy, fill in, and ship.",
  alternates: { canonical: "/tools/templates" },
  openGraph: {
    title: "Free PMM Templates | AI Marketing Workbench",
    description: "Free product marketing templates for PMM and GTM teams.",
    type: "website",
    url: "/tools/templates",
    images: [{ url: "/og?title=Free+PMM+Templates&description=Messaging+frameworks%2C+battlecards%2C+GTM+checklists+and+more&type=template", width: 1200, height: 630 }]
  },
  twitter: { card: "summary_large_image" }
};

const CATEGORY_ORDER = ["Messaging", "Positioning", "GTM", "Sales", "Research"];

export default async function TemplatesPage() {
  const templates = await getAllContent("templates");

  const byCategory: Record<string, typeof templates> = {};
  for (const t of templates) {
    const cat = t.category ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(t);
  }

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]),
    ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c))
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Free PMM Templates",
    description: "Free product marketing templates for PMM and GTM teams.",
    url: "/tools/templates"
  };

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[360px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
            Free Tools
          </div>
          <h1
            className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-text sm:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            PMM Templates
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-text2">
            Free, copy-pasteable templates for product marketing and GTM teams. Messaging frameworks, positioning statements, battlecards, GTM checklists, and more.
          </p>
        </div>

        <div className="mt-14 space-y-12">
          {orderedCategories.map((category) => (
            <section key={category}>
              <div className="mb-5 flex items-center gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">
                  {category}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {byCategory[category].map((t) => (
                  <Link
                    key={t.slug}
                    href={`/tools/templates/${t.slug}`}
                    className="group saas-card flex flex-col p-5 transition hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-text3">
                        {category}
                      </span>
                      <span className="text-text3 transition group-hover:text-primary">→</span>
                    </div>
                    <div className="mt-3 text-[15px] font-semibold text-text group-hover:text-primary">
                      {t.title}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-text2">{t.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full border border-border bg-surface2 px-2 py-0.5 text-[11px] text-text3">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16 saas-card p-8 text-center">
          <div className="text-lg font-semibold text-text">Use these templates inside a connected workspace</div>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text2">
            AI Marketing Workbench generates and maintains your positioning, messaging, battlecards, and GTM plans — connected and up to date.
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
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
