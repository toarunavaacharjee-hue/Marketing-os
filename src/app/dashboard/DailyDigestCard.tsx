"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/lib/ui";

const ANTHROPIC_KEY_STORAGE = "marketing_os_anthropic_api_key";

type DailyBriefResponse = {
  summary?: string;
  error?: string;
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
    <Card className="border border-[#2a2e3f] bg-[#141420] p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg text-[#f0f0f8]">AI Daily Digest</div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-xs font-medium text-[#f0f0f8] hover:bg-white/5 disabled:opacity-60"
        >
          {loading ? "Writing..." : "Refresh"}
        </button>
      </div>

      {!storedKey ? (
        <div className="mt-3 rounded-2xl border border-[#2a2e3f] bg-black/20 p-4 text-sm text-[#9090b0]">
          Add your Anthropic API key in the sidebar to enable this card.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#9090b0]">
        {summary ?? (loading ? "Generating your brief..." : "—")}
      </div>
    </Card>
  );
}

