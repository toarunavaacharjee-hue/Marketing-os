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

type AdSummary = {
  window: string;
  totals: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    ctr: number;
    cpc: number;
  };
  campaigns: Array<{
    name: string;
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
  }>;
};

type Tab = "ga4" | "linkedin" | "meta";

function fmtInt(n: number) {
  return new Intl.NumberFormat().format(Math.round(n));
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function fmtPctRaw(n: number) {
  return `${n.toFixed(2)}%`;
}

function fmtUSD(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="hs-card hs-card-hover p-5">
      <div className="text-xs text-text2">{label}</div>
      <div className="mt-1 text-2xl text-text">{value}</div>
    </div>
  );
}

// ─── GA4 Tab ──────────────────────────────────────────────────────────────────

function GA4Tab() {
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
          className="hs-btn hs-btn-secondary disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="hs-alert hs-alert-error">
          <div>{error}</div>
          <div className="mt-2 text-xs">
            Configure GA4 in `Settings → Analytics`, and ensure service account env vars are set in deployment.
          </div>
          <Link href="/dashboard/settings/analytics" className="hs-btn hs-btn-secondary mt-3">
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

      <div className="hs-card p-4 text-sm">
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

// ─── Ad Tab (shared layout for LinkedIn + Meta) ────────────────────────────────

function AdTab({
  apiPath,
  platform
}: {
  apiPath: string;
  platform: "LinkedIn Ads" | "Meta Ads";
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AdSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    try {
      const res = await fetch(apiPath);
      const payload = (await res.json()) as AdSummary & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (payload.code === "NOT_CONFIGURED") {
          setNotConfigured(true);
          setError(payload.error ?? "Not configured.");
        } else {
          throw new Error(payload.error ?? `Failed to load ${platform} stats.`);
        }
        setData(null);
      } else {
        setData(payload);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to load ${platform} stats.`);
      setData(null);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }

  // Load on first mount
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPath]);

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-text2">
          {data?.window ?? platform} — campaign performance
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2 disabled:opacity-60"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && !loaded ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-sm text-text2">
          Loading {platform} data…
        </div>
      ) : null}

      {error && notConfigured ? (
        <div className="rounded-[var(--radius)] border border-amber bg-amber/10 p-4 text-sm text-text">
          <div className="font-medium text-heading">{platform} not configured</div>
          <div className="mt-1 text-text2">{error}</div>
          <Link
            href="/dashboard/settings/analytics"
            className="mt-3 inline-flex rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3"
          >
            Open Analytics settings
          </Link>
        </div>
      ) : error && !notConfigured ? (
        <div className="rounded-[var(--radius)] border border-red bg-[rgba(248,113,113,0.12)] p-4 text-sm text-red">
          <div>{error}</div>
          <Link
            href="/dashboard/settings/analytics"
            className="mt-3 inline-flex rounded-[var(--radius2)] border border-red px-3 py-2 text-xs font-semibold text-red transition hover:bg-[rgba(248,113,113,0.12)]"
          >
            Open Analytics settings
          </Link>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Impressions" value={fmtInt(totals?.impressions ?? 0)} />
            <MetricCard label="Clicks" value={fmtInt(totals?.clicks ?? 0)} />
            <MetricCard label="Spend ($)" value={fmtUSD(totals?.spend ?? 0)} />
            <MetricCard label="Conversions" value={fmtInt(totals?.conversions ?? 0)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <MetricCard label="CTR (%)" value={fmtPctRaw(totals?.ctr ?? 0)} />
            <MetricCard label="CPC ($)" value={fmtUSD(totals?.cpc ?? 0)} />
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-surface p-4 text-sm">
            <div className="mb-3 text-text">Campaigns (last 30 days)</div>
            {data.campaigns.length === 0 ? (
              <div className="text-text2">No campaign data available.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-text2">
                      <th className="pb-2 pr-3 font-medium">Campaign</th>
                      <th className="pb-2 pr-3 text-right font-medium">Impressions</th>
                      <th className="pb-2 pr-3 text-right font-medium">Clicks</th>
                      <th className="pb-2 pr-3 text-right font-medium">Spend</th>
                      <th className="pb-2 text-right font-medium">Conversions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((c, i) => (
                      <tr
                        key={`${c.name}-${i}`}
                        className="border-t border-border first:border-t-0"
                      >
                        <td className="py-2 pr-3 text-text">{c.name}</td>
                        <td className="py-2 pr-3 text-right text-text2">
                          {fmtInt(c.impressions)}
                        </td>
                        <td className="py-2 pr-3 text-right text-text2">
                          {fmtInt(c.clicks)}
                        </td>
                        <td className="py-2 pr-3 text-right text-text2">
                          {fmtUSD(c.spend)}
                        </td>
                        <td className="py-2 text-right text-text2">
                          {fmtInt(c.conversions)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────────

export function AnalyticsClient() {
  const [activeTab, setActiveTab] = useState<Tab>("ga4");

  const tabs: { id: Tab; label: string }[] = [
    { id: "ga4", label: "Google Analytics" },
    { id: "linkedin", label: "LinkedIn Ads" },
    { id: "meta", label: "Meta Ads" }
  ];

  return (
    <div className="space-y-5">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface2 text-text hover:bg-surface3"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === "ga4" && <GA4Tab />}
      {activeTab === "linkedin" && (
        <AdTab
          apiPath="/api/analytics/linkedin/summary"
          platform="LinkedIn Ads"
        />
      )}
      {activeTab === "meta" && (
        <AdTab
          apiPath="/api/analytics/meta/summary"
          platform="Meta Ads"
        />
      )}
    </div>
  );
}
