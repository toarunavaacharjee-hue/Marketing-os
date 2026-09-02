import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { Markdown } from "@/lib/Markdown";
import { getAllContent, getContentEntry } from "@/lib/content";

export async function generateStaticParams() {
  const useCases = await getAllContent("use-cases");
  return useCases.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const useCase = await getContentEntry("use-cases", params.slug);
  if (!useCase) return {};

  return {
    title: `${useCase.title} | AI Marketing Workbench`,
    description: useCase.description,
    alternates: { canonical: `/use-cases/${useCase.slug}` },
    openGraph: {
      title: useCase.title,
      description: useCase.description,
      type: "article",
      url: `/use-cases/${useCase.slug}`
    }
  };
}

export default async function UseCasePage({ params }: { params: { slug: string } }) {
  const useCase = await getContentEntry("use-cases", params.slug);
  if (!useCase) notFound();

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10">
          <Link href="/use-cases" className="text-sm text-text2 transition hover:text-text">
            ← Back to Use Cases
          </Link>
        </div>

        <article className="mt-6 saas-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
            <span>Use Case</span>
            {useCase.audience ? (
              <>
                <span className="text-text3">•</span>
                <span className="text-[#c4b8ff]">{useCase.audience}</span>
              </>
            ) : null}
          </div>
          <h1
            className="mt-3 text-3xl font-semibold leading-[1.12] tracking-tight text-text sm:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {useCase.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text2 sm:text-[15px]">{useCase.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {useCase.tags.map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-text2">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <Markdown content={useCase.content} />
          </div>
        </article>

        <section className="mt-6 saas-card p-6">
          <div className="text-sm font-semibold text-text">Want to see this workflow in action?</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">
            AI Marketing Workbench connects research, ICPs, positioning, campaigns, and analytics in one workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={useCase.heroCtaHref ?? "/contact"}
              className="saas-btn saas-btn-cta px-4 py-2 text-[13px]"
            >
              {useCase.heroCtaLabel ?? "Book a Demo"}
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
            >
              Read the blog
            </Link>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
