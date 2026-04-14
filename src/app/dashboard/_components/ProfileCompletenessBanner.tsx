"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const MIN_KEY = "aimw-profile-banner-min";

export function ProfileCompletenessBanner() {
  const [score, setScore] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(MIN_KEY) === "1") {
        setMinimized(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

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

  function persistMinimize(next: boolean) {
    setMinimized(next);
    try {
      if (next) localStorage.setItem(MIN_KEY, "1");
      else localStorage.removeItem(MIN_KEY);
    } catch {
      /* ignore */
    }
  }

  if (minimized) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary-light/40 px-3 py-2 text-[12px] shadow-sm">
        <span className="font-medium text-heading">
          Profile {score}% complete —{" "}
          <Link href="/dashboard/settings/product" className="text-link underline-offset-2 hover:underline">
            finish setup
          </Link>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => persistMinimize(false)}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-text2 hover:bg-surface2 hover:text-heading"
          >
            Expand
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md px-2 py-1 text-[11px] text-text3 hover:text-heading"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

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
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => persistMinimize(true)}
            className="rounded-lg px-2 py-1 text-[12px] font-medium text-text3 hover:text-heading"
          >
            Minimize
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg px-2 py-1 text-[12px] text-text3 hover:text-heading"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
