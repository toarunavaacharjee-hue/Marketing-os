"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_CAP = 94;

/** User-facing copy: we cannot know exact time without server streaming; bar is indeterminate. */
export const AI_PROGRESS_ESTIMATE = {
  short:
    "Most generations finish in about 15–60 seconds. The percentage is an estimate until the model returns.",
  chat:
    "Most replies finish in about 15–90 seconds. The percentage is an estimate until the model returns.",
  scan:
    "Gathering pages and synthesizing market signals. Full scans often take 1–6 minutes; the bar eases toward completion while we poll.",
  deep:
    "Heavier jobs often take 30 seconds to a few minutes. The percentage is an estimate until complete.",
  memo:
    "Building your prospect memo often takes 1–8 minutes; in the background it can run longer on busy queues. The bar is an estimate until the memo appears.",
  extract:
    "Reading your file and extracting fields usually takes 20–90 seconds. The percentage is an estimate.",
  positioning:
    "Regenerating positioning from segments usually takes 20–90 seconds. The percentage is an estimate."
} as const;

type Variant = "dashboard" | "dark";

type Props = {
  active: boolean;
  title: string;
  estimate?: string;
  /** Wall-clock ms to ease the bar toward `capPercent` (indeterminate). */
  durationMs?: number;
  capPercent?: number;
  variant?: Variant;
  className?: string;
};

export function AiProgressBar({
  active,
  title,
  estimate,
  durationMs = 45_000,
  capPercent = DEFAULT_CAP,
  variant: _variant = "dashboard",
  className = ""
}: Props) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      setProgress(0);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const elapsed = now - started;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) * (1 - t);
      setProgress(Math.min(capPercent, eased * capPercent));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, durationMs, capPercent]);

  if (!active) return null;

  // Light shell only (legacy "dark" variant aligned to HubSpot-style dashboard tokens).
  const shell = "rounded-lg border border-border bg-surface p-4 shadow-card";
  const textPrimary = "text-text";
  const textSecondary = "text-text2";
  const barBg = "bg-surface3 ring-1 ring-inset ring-border/60";
  const barFill = "bg-primary";

  return (
    <div
      className={`${shell} ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      aria-label={title}
    >
      <div className={`flex flex-wrap items-center justify-between gap-2 text-sm font-semibold ${textPrimary}`}>
        <span>{title}</span>
        <span className={`tabular-nums ${textSecondary}`}>{Math.round(progress)}%</span>
      </div>
      <div className={`mt-3 h-2.5 w-full overflow-hidden rounded-full ${barBg}`}>
        <div
          className={`h-full rounded-full transition-[width] duration-150 ease-out ${barFill}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      {estimate ? <p className={`mt-2 text-xs leading-relaxed ${textSecondary}`}>{estimate}</p> : null}
    </div>
  );
}
