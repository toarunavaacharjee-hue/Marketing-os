import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog/posts";

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return {};

  return {
    title: `${post.title} | AI Marketing Workbench`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `/blog/${post.slug}`
    }
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <div className="mt-10">
          <Link href="/blog" className="text-sm text-text2 transition hover:text-text">
            ← Back to Blog
          </Link>
        </div>

        <article className="mt-6 saas-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
            <span>{post.date}</span>
            <span className="text-text3">•</span>
            <span className="text-[#c4b8ff]">PMM / GTM</span>
          </div>
          <h1
            className="mt-3 text-3xl font-semibold leading-[1.12] tracking-tight text-text sm:text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {post.title}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-text2 sm:text-[15px]">{post.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-text2">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">{post.render()}</div>
        </article>

        <section className="mt-6 saas-card p-6">
          <div className="text-sm font-semibold text-text">Want to implement this inside the product?</div>
          <p className="mt-2 text-sm leading-relaxed text-text2">
            Marketing Workbench connects ICP → Positioning → Messaging → Campaigns, then tracks outcomes weekly.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup?plan=starter"
              className="inline-flex items-center justify-center rounded-lg bg-[#b8ff6c] px-4 py-2 text-[13px] font-semibold text-[#0a0a0c] shadow-lg shadow-[#b8ff6c]/15 transition hover:bg-[#c8ff7c]"
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
      </main>

      <MarketingFooter />
    </div>
  );
}

