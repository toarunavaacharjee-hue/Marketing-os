import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GLOSSARY_TERMS, getTermBySlug, getRelatedTerms } from "@/lib/glossary";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { getSiteUrl } from "@/lib/siteUrl";

export async function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }: { params: { term: string } }): Promise<Metadata> {
  const term = getTermBySlug(params.term);
  if (!term) return {};

  const title = `${term.term} — Definition`;
  const ogImage = `/og?title=${encodeURIComponent(term.term)}&description=${encodeURIComponent(term.shortDef)}&type=glossary`;

  return {
    title,
    description: term.shortDef,
    alternates: { canonical: `/tools/glossary/${term.slug}` },
    openGraph: {
      title,
      description: term.shortDef,
      type: "article",
      url: `/tools/glossary/${term.slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: term.term }]
    },
    twitter: { card: "summary_large_image", title, description: term.shortDef, images: [ogImage] }
  };
}

export default function GlossaryTermPage({ params }: { params: { term: string } }) {
  const term = getTermBySlug(params.term);
  if (!term) notFound();

  const related = getRelatedTerms(term);
  const siteUrl = getSiteUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    description: term.shortDef,
    url: `${siteUrl}/tools/glossary/${term.slug}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Product Marketing Glossary",
      url: `${siteUrl}/tools/glossary`
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[360px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10">
          <Link href="/tools/glossary" className="text-sm text-text2 transition hover:text-text">
            ← Glossary
          </Link>
        </div>

        <article className="mt-6 saas-card p-6 sm:p-8">
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
            {term.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-surface2 px-2.5 py-1">
                {tag}
              </span>
            ))}
          </div>

          <h1
            className="mt-3 text-3xl font-semibold leading-[1.12] tracking-tight text-text sm:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {term.term}
          </h1>

          <p className="mt-4 text-base font-medium leading-relaxed text-[#c4b8ff]">
            {term.shortDef}
          </p>

          <div className="mt-6 border-t border-border pt-6 text-[15px] leading-relaxed text-text2">
            {term.definition}
          </div>

          {term.example && (
            <div className="mt-6 rounded-xl border border-border bg-surface2 p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">Example</div>
              <p className="mt-2 text-sm leading-relaxed text-text2 italic">{term.example}</p>
            </div>
          )}
        </article>

        {related.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Related terms</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/tools/glossary/${r.slug}`}
                  className="group saas-card p-4 transition hover:border-primary/40"
                >
                  <div className="text-[13px] font-semibold text-text group-hover:text-primary">{r.term}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-text3 line-clamp-2">{r.shortDef}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 saas-card p-6">
          <div className="text-sm font-semibold text-text">Put this into practice</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">
            AI Marketing Workbench gives you the modules to apply every concept in this glossary — positioning, ICP, messaging, battlecards, and GTM planning in one connected workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup?plan=starter"
              className="inline-flex items-center justify-center rounded-lg bg-amber px-4 py-2 text-[13px] font-semibold text-heading shadow-card transition hover:bg-amber-hover"
            >
              Start free
            </Link>
            <Link
              href="/tools/glossary"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              Browse glossary
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
