"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function ProfileCompletenessBanner() {
  const [score, setScore] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/profile/completeness");
        const data = (await res.json()) as { score?: number; missing?: string[]; error?: string };
        if (!res.ok || typeof data.score !== "number") return;
        if (!cancelled) {
          setScore(data.score);
          setMissing(Array.isArray(data.missing) ? data.missing : []);
        }
      } catch {
        // Migration may not be applied yet — stay silent.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (score === null || score >= 80 || dismissed) return null;

  return (
    <div className="mb-6 rounded-lg border border-primary/30 bg-primary-light/50 px-4 py-3 text-sm shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-heading">Complete your product spine ({score}%)</div>
          <p className="mt-1 text-[13px] text-text2">
            A stronger profile improves AI quality and keeps your team aligned. Still needed:{" "}
            {missing.slice(0, 3).join("; ")}
            {missing.length > 3 ? "…" : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/dashboard/settings/product"
              className="inline-flex rounded-sm bg-amber px-3 py-1.5 text-[12px] font-semibold text-heading shadow-sm hover:bg-amber-hover"
            >
              Product settings
            </Link>
            <Link
              href="/dashboard/positioning-studio"
              className="inline-flex rounded-sm border border-input-border bg-surface px-3 py-1.5 text-[12px] font-medium text-text hover:bg-surface2"
            >
              Positioning Studio
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-text3 hover:text-heading"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
