"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/lib/ui";

const ANTHROPIC_KEY_STORAGE = "marketing_os_anthropic_api_key";

type DailyBriefResponse = {
  summary?: string;
  error?: string;
  code?: string;
};

export function DailyDigestCard() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storedKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ANTHROPIC_KEY_STORAGE) ?? "";
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/daily-brief", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(storedKey ? { "x-anthropic-key": storedKey } : {})
        },
        body: JSON.stringify({
          context: {
            demo: true
          }
        })
      });

      const data = (await res.json()) as DailyBriefResponse;
      if (!res.ok) throw new Error(data.error ?? "Failed to generate brief.");
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate brief.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
          🤖 AI Daily Digest
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-[12px] font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-60"
        >
          {loading ? "Writing..." : "Refresh"}
        </button>
      </div>

      {!storedKey ? (
        <div className="mt-3 rounded-[var(--radius)] border border-border bg-surface2 p-4 text-[13px] text-text2">
          Add your Anthropic API key in the sidebar to enable this card.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-[13px] text-red">
          {error}
        </div>
      ) : null}

      <div className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-text2">
        {summary ?? (loading ? "Generating your brief..." : "—")}
      </div>

      <Link
        href="/dashboard/copilot"
        className="mt-4 inline-flex w-full items-center justify-center rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-[12px] font-semibold text-text transition hover:bg-surface3 hover:border-border2"
      >
        Ask AI for more insights →
      </Link>
    </div>
  );
}

