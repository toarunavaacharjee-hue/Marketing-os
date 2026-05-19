"use client";

import { usePathname } from "next/navigation";
import { useProductStaleness } from "@/hooks/useProductStaleness";

type ProductStaleBannerProps = {
  environmentId: string;
  moduleName: string;
};

export function ProductStaleBanner({ environmentId, moduleName }: ProductStaleBannerProps) {
  const { isStale, dismiss } = useProductStaleness(environmentId);
  const pathname = usePathname();

  if (!isStale) return null;

  const regenerateHref = `${pathname}?refresh=1`;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-amber/40 bg-amber/8 px-4 py-3 text-sm text-text"
      role="alert"
      aria-label={`${moduleName} staleness warning`}
    >
      {/* Left accent bar */}
      <span className="w-1 self-stretch rounded-full bg-amber shrink-0" aria-hidden="true" />

      {/* Refresh icon */}
      <span className="shrink-0 text-amber" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M23 4v6h-6" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </span>

      <span className="flex-1">
        Your product profile was updated. Module outputs may be out of date.
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={regenerateHref}
          className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-1 text-xs font-semibold text-amber hover:bg-amber/20 transition-colors"
        >
          Regenerate
        </a>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg border border-border bg-surface px-3 py-1 text-xs font-semibold text-text2 hover:bg-surface2 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
