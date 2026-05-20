"use client";

import Link from "next/link";

type EmptyStateProps = {
  icon?: string;
  headline: string;
  subheading?: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
};

export function EmptyState({ icon, headline, subheading, cta, secondaryCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface2 px-6 py-14 text-center">
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center hs-card text-3xl shadow-sm">
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-text">{headline}</p>
      {subheading ? (
        <p className="mt-2 max-w-sm text-sm text-text2 leading-relaxed">{subheading}</p>
      ) : null}
      {cta ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {cta.href ? (
            <Link
              href={cta.href}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
              {cta.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={cta.onClick}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
              {cta.label}
            </button>
          )}
          {secondaryCta ? (
            <Link
              href={secondaryCta.href}
              className="hs-card px-5 py-2.5 text-sm font-semibold text-text hover:bg-surface2"
            >
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
