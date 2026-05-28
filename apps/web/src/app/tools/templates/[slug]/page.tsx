import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllContent, getContentEntry } from "@/lib/content";
import { Markdown } from "@/lib/Markdown";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { getSiteUrl } from "@/lib/siteUrl";

export async function generateStaticParams() {
  const templates = await getAllContent("templates");
  return templates.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const template = await getContentEntry("templates", params.slug);
  if (!template) return {};

  const ogImage = `/og?title=${encodeURIComponent(template.title)}&description=${encodeURIComponent(template.description)}&type=template`;

  return {
    title: template.title,
    description: template.description,
    alternates: { canonical: `/tools/templates/${template.slug}` },
    openGraph: {
      title: template.title,
      description: template.description,
      type: "article",
      url: `/tools/templates/${template.slug}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: template.title }]
    },
    twitter: { card: "summary_large_image", title: template.title, description: template.description, images: [ogImage] }
  };
}

export default async function TemplatePage({ params }: { params: { slug: string } }) {
  const template = await getContentEntry("templates", params.slug);
  if (!template) notFound();

  const allTemplates = await getAllContent("templates");
  const related = allTemplates.filter((t) => t.slug !== template.slug).slice(0, 3);

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: template.title,
    description: template.description,
    url: `${siteUrl}/tools/templates/${template.slug}`,
    publisher: { "@type": "Organization", name: "AI Marketing Workbench", url: siteUrl }
  };

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[360px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10">
          <Link href="/tools/templates" className="text-sm text-text2 transition hover:text-text">
            ← All Templates
          </Link>
        </div>

        <article className="mt-6 saas-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
            <span className="rounded-full border border-border bg-surface2 px-2.5 py-1">
              {template.category ?? "Template"}
            </span>
            <span>•</span>
            <span className="text-[#c4b8ff]">Free Template</span>
          </div>

          <h1
            className="mt-3 text-3xl font-semibold leading-[1.12] tracking-tight text-text sm:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {template.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text2 sm:text-[15px]">{template.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {template.tags.map((t) => (
              <span key={t} className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-text2">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <Markdown content={template.content} />
          </div>
        </article>

        <section className="mt-6 saas-card p-6">
          <div className="text-sm font-semibold text-text">Use this template with AI — connected to your strategy</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">
            AI Marketing Workbench generates and maintains your messaging frameworks, battlecards, and GTM plans — connected to your positioning and ICP.
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

        {related.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">More templates</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {related.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tools/templates/${t.slug}`}
                  className="group saas-card p-4 transition hover:border-primary/40"
                >
                  <div className="text-[13px] font-semibold text-text group-hover:text-primary">{t.title}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-text3 line-clamp-2">{t.description}</p>
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
