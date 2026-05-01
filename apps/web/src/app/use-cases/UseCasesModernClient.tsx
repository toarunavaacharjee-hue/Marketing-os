"use client";

import Link from "next/link";

type Entry = {
  slug: string;
  title: string;
  description: string;
  date: string | null;
  tags: string[];
  audience: string | null;
};

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="saas-kicker">
      <span className="saas-kicker-dot" />
      {children}
    </div>
  );
}

export function UseCasesModernClient({ useCases }: { useCases: Entry[] }) {
  return (
    <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-[5.5rem] sm:px-6">
      <header className="pt-10">
        <Kicker>Use cases</Kicker>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.06] tracking-tight text-text md:text-5xl lg:text-[3.25rem]" style={{ fontFamily: "var(--font-heading)" }}>
          Built for teams running real marketing systems
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-text2">
          Explore how AI Marketing Workbench supports product marketing teams, founders, GTM leaders, consultants, and multi-product companies with one
          connected workspace.
        </p>
      </header>

      <section className="mt-10 saas-bento">
        {useCases.map((entry) => (
          <article key={entry.slug} className="saas-bento-card saas-bento-card-hover p-6 md:col-span-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text3">
              <span>Use Case</span>
              {entry.audience ? (
                <>
                  <span className="text-text3">•</span>
                  <span className="text-primary">{entry.audience}</span>
                </>
              ) : null}
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-text" style={{ fontFamily: "var(--font-heading)" }}>
              <Link href={`/use-cases/${entry.slug}`} className="transition hover:text-primary">
                {entry.title}
              </Link>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text2">{entry.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {entry.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-[11px] text-text2">
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-6">
              <Link href={`/use-cases/${entry.slug}`} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-focus transition hover:bg-primary-dark">
                View use case
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

