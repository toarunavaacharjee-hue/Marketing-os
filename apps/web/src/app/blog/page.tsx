import Link from "next/link";
import type { Metadata } from "next";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/MarketingChrome";
import { BLOG_POSTS } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog | AI Marketing Workbench",
  description: "Templates, frameworks, and playbooks for PMM & GTM teams shipping weekly."
};

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="min-h-screen bg-bg text-text antialiased" style={{ fontFamily: "var(--font-body)" }}>
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-x-0 top-[60px] h-[420px] saas-hero-glow" aria-hidden />

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">
        <header className="mt-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3">Resources</div>
          <h1
            className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-text md:text-5xl lg:text-[3.25rem]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Blog
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
            Practical GTM frameworks, templates, and checklists. Built for operators who want execution speed—not bloat.
          </p>
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          {posts.map((p) => (
            <article key={p.slug} className="saas-card saas-card-hover p-6">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
                <span>{p.date}</span>
                <span className="text-text3">•</span>
                <span className="text-[#c4b8ff]">PMM / GTM</span>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
                <Link href={`/blog/${p.slug}`} className="transition hover:text-[#c4b8ff]">
                  {p.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-text2">{p.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span key={t} className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-text2">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  href={`/blog/${p.slug}`}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-surface2 px-4 py-2 text-[13px] font-medium text-text transition hover:bg-surface3"
                >
                  Read post
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

