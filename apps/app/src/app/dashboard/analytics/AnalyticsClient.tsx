"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type GaSummary = {
  window: string;
  metrics: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
    engagementRate: number;
    bounceRate: number;
    conversions: number;
    conversionRate: number;
  };
  topPages: Array<{ path: string; views: number }>;
};

function fmtInt(n: number) {
  return new Intl.NumberFormat().format(Math.round(n));
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtPctRaw(n: number) {
  return `${n.toFixed(2)}%`;
}

export function AnalyticsClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<GaSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/ga4/summary");
      const payload = (await res.json()) as GaSummary & { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load GA stats.");
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load GA stats.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-text2">
          {data?.window ?? "Google Analytics 4"} stats from your real property
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
          <div>{error}</div>
          <div className="mt-2 text-xs text-red/90">
            Configure GA4 in `Settings → Analytics`, and ensure service account env vars are set in deployment.
          </div>
          <Link
            href="/dashboard/settings/analytics"
            className="mt-3 inline-flex rounded-[var(--radius2)] border border-red px-3 py-2 text-xs font-semibold text-red transition hover:bg-[rgba(248,113,113,0.12)]"
          >
            Open Analytics settings
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Active users" value={fmtInt(data?.metrics.activeUsers ?? 0)} />
        <MetricCard label="New users" value={fmtInt(data?.metrics.newUsers ?? 0)} />
        <MetricCard label="Sessions" value={fmtInt(data?.metrics.sessions ?? 0)} />
        <MetricCard label="Page views" value={fmtInt(data?.metrics.pageViews ?? 0)} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard
          label="Engagement rate"
          value={fmtPct(data?.metrics.engagementRate ?? 0)}
        />
        <MetricCard
          label="Bounce rate"
          value={fmtPct(data?.metrics.bounceRate ?? 0)}
        />
        <MetricCard
          label="Conversions"
          value={fmtInt(data?.metrics.conversions ?? 0)}
        />
        <MetricCard
          label="Conversion rate"
          value={fmtPctRaw(data?.metrics.conversionRate ?? 0)}
        />
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-surface p-4 text-sm">
        <div className="mb-2 text-text">Top pages (last 30 days)</div>
        <table className="w-full text-text2">
          <tbody>
            {(data?.topPages ?? []).length ? (
              data!.topPages.map((p) => (
                <tr key={p.path} className="border-t border-border first:border-t-0">
                  <td className="py-2 pr-3 text-text">{p.path}</td>
                  <td className="py-2 text-right">{fmtInt(p.views)} views</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="py-2 text-text2" colSpan={2}>
                  {loading ? "Loading pages..." : "No page data available."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="text-xs text-text2">{label}</div>
      <div className="mt-1 text-2xl text-text">{value}</div>
    </div>
  );
}

