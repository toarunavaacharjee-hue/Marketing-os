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
    <div className="mb-6 rounded-2xl border border-[#7c6cff]/35 bg-[#7c6cff]/10 px-4 py-3 text-sm text-[#e8e6ff]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">Complete your product spine ({score}%)</div>
          <p className="mt-1 text-[13px] text-[#c4b8ff]">
            A stronger profile improves AI quality and keeps your team aligned. Still needed:{" "}
            {missing.slice(0, 3).join("; ")}
            {missing.length > 3 ? "…" : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/dashboard/settings/product"
              className="inline-flex rounded-lg bg-[#b8ff6c] px-3 py-1.5 text-[12px] font-semibold text-[#0a0a0c] hover:bg-[#c8ff7c]"
            >
              Product settings
            </Link>
            <Link
              href="/dashboard/positioning-studio"
              className="inline-flex rounded-lg border border-white/15 bg-black/20 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-white/5"
            >
              Positioning Studio
            </Link>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-[#9090b0] hover:text-white"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
