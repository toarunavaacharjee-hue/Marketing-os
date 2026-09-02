import type { Metadata } from "next";
import Link from "next/link";
import { GLOSSARY_TERMS } from "@/lib/glossary";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";

export const metadata: Metadata = {
  title: "Product Marketing Glossary",
  description:
    "Definitions for 25+ product marketing and GTM terms — ICP, positioning, messaging framework, battlecard, win/loss analysis, GTM motion, and more.",
  alternates: { canonical: "/tools/glossary" },
  openGraph: {
    title: "Product Marketing Glossary | AI Marketing Workbench",
    description: "Clear definitions for every PMM and GTM term you need to know.",
    type: "website",
    url: "/tools/glossary",
    images: [{ url: "/og?title=Product+Marketing+Glossary&description=25%2B+PMM+and+GTM+terms+defined&type=glossary", width: 1200, height: 630 }]
  },
  twitter: { card: "summary_large_image" }
};

export default function GlossaryPage() {
  const sorted = [...GLOSSARY_TERMS].sort((a, b) => a.term.localeCompare(b.term));

  const byLetter: Record<string, typeof sorted> = {};
  for (const term of sorted) {
    const letter = term.term[0].toUpperCase();
    if (!byLetter[letter]) byLetter[letter] = [];
    byLetter[letter].push(term);
  }

  const letters = Object.keys(byLetter).sort();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Product Marketing Glossary",
    description: "Definitions for product marketing and GTM terms.",
    url: "/tools/glossary",
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.shortDef,
      url: `/tools/glossary/${t.slug}`
    }))
  };

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[360px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-4xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
            Free Tools
          </div>
          <h1
            className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-text sm:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Product Marketing Glossary
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-text2">
            Clear definitions for every PMM, GTM, and SaaS metric term. {GLOSSARY_TERMS.length} terms and counting.
          </p>
        </div>

        {/* Letter nav */}
        <div className="mt-10 flex flex-wrap justify-center gap-1.5">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface2 text-[12px] font-semibold text-text2 transition hover:border-primary/40 hover:text-primary"
            >
              {letter}
            </a>
          ))}
        </div>

        <div className="mt-12 space-y-10">
          {letters.map((letter) => (
            <section key={letter} id={`letter-${letter}`}>
              <div className="mb-4 flex items-center gap-3">
                <div className="text-xl font-bold text-text3">{letter}</div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-3">
                {byLetter[letter].map((term) => (
                  <Link
                    key={term.slug}
                    href={`/tools/glossary/${term.slug}`}
                    className="group flex items-start gap-4 saas-card p-4 transition hover:border-primary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-text group-hover:text-primary">
                        {term.term}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-text2">{term.shortDef}</p>
                    </div>
                    <span className="mt-0.5 shrink-0 text-text3 transition group-hover:text-primary">→</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
