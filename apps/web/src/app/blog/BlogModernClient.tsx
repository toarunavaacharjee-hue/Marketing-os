"use client";

import Link from "next/link";

type Entry = {
  slug: string;
  title: string;
  description: string;
  date: string | null;
  tags: string[];
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="saas-kicker">
      <span className="saas-kicker-dot" />
      {children}
    </div>
  );
}

export function BlogModernClient({ posts }: { posts: Entry[] }) {
  return (
    <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">
      <header className="pt-10">
        <Kicker>Resources</Kicker>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.06] tracking-tight text-text md:text-5xl lg:text-[3.25rem]" style={{ fontFamily: "var(--font-heading)" }}>
          Blog
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
          Practical GTM frameworks, templates, and checklists. Built for operators who want execution speed.
        </p>
      </header>

      <section className="mt-10 saas-bento">
        {posts.map((p) => (
          <article key={p.slug} className="saas-bento-card saas-bento-card-hover p-6 md:col-span-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
              <span>{p.date ?? "Latest"}</span>
              <span className="text-text3">•</span>
              <span className="text-primary">PMM / GTM</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
              <Link href={`/blog/${p.slug}`} className="transition hover:text-primary">
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
              <Link href={`/blog/${p.slug}`} className="saas-btn saas-btn-accent px-4 py-2 text-[13px]">
                Read post
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

