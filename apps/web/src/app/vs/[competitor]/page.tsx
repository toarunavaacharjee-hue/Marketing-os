import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllContent, getContentEntry } from "@/lib/content";
import { Markdown } from "@/lib/Markdown";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { getSiteUrl } from "@/lib/siteUrl";

export async function generateStaticParams() {
  const pages = await getAllContent("vs");
  return pages.map((p) => ({ competitor: p.slug }));
}

export async function generateMetadata({ params }: { params: { competitor: string } }): Promise<Metadata> {
  const page = await getContentEntry("vs", params.competitor);
  if (!page) return {};

  const ogImage = `/og?title=${encodeURIComponent(page.title)}&description=${encodeURIComponent(page.description)}&type=vs`;

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/vs/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      type: "article",
      url: `/vs/${page.slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: page.title }]
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description, images: [ogImage] }
  };
}

export default async function VsPage({ params }: { params: { competitor: string } }) {
  const page = await getContentEntry("vs", params.competitor);
  if (!page) notFound();

  const allVs = await getAllContent("vs");
  const others = allVs.filter((p) => p.slug !== page.slug).slice(0, 4);

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.description,
    url: `${siteUrl}/vs/${page.slug}`,
    publisher: { "@type": "Organization", name: "AI Marketing Workbench", url: siteUrl }
  };

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[360px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10">
          <Link href="/pricing" className="text-sm text-text2 transition hover:text-text">
            ← Back
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
          <span className="rounded-full border border-border bg-surface2 px-2.5 py-1">Comparison</span>
          <span>•</span>
          <span className="text-[#c4b8ff]">vs {page.competitor}</span>
        </div>

        <h1
          className="mt-3 text-3xl font-semibold leading-[1.12] tracking-tight text-text sm:text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {page.title}
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-text2">{page.description}</p>

        <article className="mt-8 saas-card p-6 sm:p-8">
          <Markdown content={page.content} />
        </article>

        <section className="mt-6 saas-card p-6">
          <div className="text-sm font-semibold text-text">Try AI Marketing Workbench free</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">
            18 connected modules — positioning, ICP, messaging, battlecards, campaigns, GTM planning, and analytics — starting at $19/month.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup?plan=starter"
              className="inline-flex items-center justify-center rounded-lg bg-amber px-4 py-2 text-[13px] font-semibold text-heading shadow-card transition hover:bg-amber-hover"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              See pricing
            </Link>
          </div>
        </section>

        {others.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">More comparisons</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {others.map((p) => (
                <Link
                  key={p.slug}
                  href={`/vs/${p.slug}`}
                  className="group saas-card p-4 transition hover:border-primary/40"
                >
                  <div className="text-[13px] font-semibold text-text group-hover:text-primary">{p.title}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-text3 line-clamp-2">{p.description}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <MarketingFooter />
    </div>
  );
}
