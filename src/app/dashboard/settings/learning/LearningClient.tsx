"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SyncRun = {
  id: string;
  connector: string;
  status: string;
  assets_ingested: number;
  is_demo: boolean;
  message: string | null;
  finished_at: string | null;
  started_at: string;
};

type Asset = {
  id: string;
  source: string;
  asset_type: string;
  title: string;
  status: string;
  is_demo: boolean;
  last_seen_at: string;
};

const MODULES = [
  "Command Centre",
  "Market Research",
  "ICP Segmentation",
  "Positioning Studio",
  "Messaging & Artifacts",
  "Campaigns",
  "GTM Planner",
  "Events",
  "Content Studio",
  "Social Media",
  "Design & Assets",
  "Presentations",
  "Website & Pages",
  "Analytics",
  "Battlecards",
  "Sales Intelligence",
  "Customer Insights",
  "AI Copilot"
];

export default function LearningClient({ environmentId }: { environmentId: string }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);

    const [syncRes, assetsRes] = await Promise.all([
      supabase
        .from("sync_runs")
        .select("id,connector,status,assets_ingested,is_demo,message,finished_at,started_at")
        .eq("environment_id", environmentId)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("assets")
        .select("id,source,asset_type,title,status,is_demo,last_seen_at")
        .eq("environment_id", environmentId)
        .order("last_seen_at", { ascending: false })
        .limit(50)
    ]);

    if (syncRes.error) setError(syncRes.error.message);
    else setSyncRuns((syncRes.data ?? []) as SyncRun[]);

    if (assetsRes.error) setError(assetsRes.error.message);
    else setAssets((assetsRes.data ?? []) as Asset[]);

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId]);

  async function clearLegacyDemoData() {
    setError(null);
    const del1 = await supabase
      .from("assets")
      .delete()
      .eq("environment_id", environmentId)
      .eq("is_demo", true);
    if (del1.error) {
      setError(del1.error.message);
      return;
    }
    const del2 = await supabase
      .from("sync_runs")
      .delete()
      .eq("environment_id", environmentId)
      .eq("is_demo", true);
    if (del2.error) {
      setError(del2.error.message);
      return;
    }
    await load();
  }

  const countsByType = assets.reduce<Record<string, number>>((acc, a) => {
    acc[a.asset_type] = (acc[a.asset_type] ?? 0) + 1;
    return acc;
  }, {});

  const coverageScore = (moduleName: string) => {
    const m = moduleName.toLowerCase();
    const hasDeals = (countsByType["deal"] ?? 0) + (countsByType["call_note"] ?? 0) > 0;
    const hasAds = (countsByType["creative"] ?? 0) + (countsByType["post"] ?? 0) > 0;
    const hasSite = (countsByType["page"] ?? 0) > 0;
    const hasDocs = (countsByType["doc"] ?? 0) + (countsByType["deck"] ?? 0) > 0;

    if (m.includes("analytics")) return hasAds || hasSite ? "good" : "low";
    if (m.includes("sales") || m.includes("battlecards")) return hasDeals || hasDocs ? "good" : "low";
    if (m.includes("website")) return hasSite ? "good" : "low";
    if (m.includes("content") || m.includes("social") || m.includes("design")) return hasAds || hasDocs ? "good" : "low";
    return hasDocs || hasSite ? "ok" : "low";
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg text-heading">Learning & Health</div>
            <div className="mt-1 text-sm text-text2">
              See whether the system has enough signal to power each module.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={clearLegacyDemoData}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red hover:bg-red-500/15"
            >
              Clear legacy demo data
            </button>
          </div>
        </div>

        {syncRuns.some((s) => s.is_demo) || assets.some((a) => a.is_demo) ? (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-heading">
            Demo data is currently enabled for this product’s Default environment.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
            {error}
          </div>
        ) : null}

        {loading ? <div className="mt-4 text-sm text-text2">Loading…</div> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Stat label="Sources connected (enabled)" value={String(enabledCount(syncRuns))} />
          <Stat label="Assets indexed" value={String(assets.length)} />
          <Stat label="Stale / Failed" value={String(countByStatus(assets, ["stale", "failed"]))} />
          <Stat label="Last sync" value={formatLast(syncRuns[0]?.started_at)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-sm text-heading">Sync status</div>
          <div className="mt-3 space-y-2">
            {(["ga4", "hubspot", "linkedin_ads", "meta_ads"] as const).map((c) => {
              const latest = syncRuns.find((s) => s.connector === c) ?? null;
              return (
                <div key={c} className="rounded-xl border border-border bg-surface2 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-heading">{labelConnector(c)}</div>
                    <Chip tone={latest?.status ?? "unknown"} text={latest?.status ?? "unknown"} />
                  </div>
                  <div className="mt-1 text-sm text-text2">
                    {latest?.message ?? "No sync run yet."}
                  </div>
                  <div className="mt-2 text-xs text-text2">
                    Ingested: <span className="text-heading">{latest?.assets_ingested ?? 0}</span> •{" "}
                    {formatLast(latest?.started_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-sm text-heading">Asset ingestion (last seen)</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {Object.entries(countsByType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([type, n]) => (
                <div key={type} className="rounded-xl border border-border bg-surface2 p-3">
                  <div className="text-xs uppercase tracking-wider text-text2">{type}</div>
                  <div className="mt-1 text-sm text-heading">{n}</div>
                </div>
              ))}
          </div>
          {assets.length === 0 ? (
            <div className="mt-3 text-sm text-text2">
              No assets indexed yet. Connect integrations and run sync to ingest real data.
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="text-sm text-heading">Module coverage</div>
        <div className="mt-1 text-sm text-text2">
          This is a simple “do we have enough signal?” view. We’ll replace this with real coverage rules once connectors are live.
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m} className="rounded-xl border border-border bg-surface2 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-heading">{m}</div>
                <CoveragePill level={coverageScore(m)} />
              </div>
              <div className="mt-2 text-xs text-text2">
                Signals: pages {countsByType["page"] ?? 0} • creatives {countsByType["creative"] ?? 0} • deals {countsByType["deal"] ?? 0}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function enabledCount(syncRuns: SyncRun[]) {
  // In Phase 2 we treat “has at least one run” as “connected enough to show”.
  const unique = new Set(syncRuns.map((s) => s.connector));
  return unique.size;
}

function countByStatus(assets: Asset[], statuses: string[]) {
  const set = new Set(statuses);
  return assets.filter((a) => set.has(a.status)).length;
}

function formatLast(ts?: string | null) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

function labelConnector(c: string) {
  if (c === "ga4") return "Google Analytics (GA4)";
  if (c === "hubspot") return "HubSpot";
  if (c === "linkedin_ads") return "LinkedIn Ads";
  if (c === "meta_ads") return "Meta Ads";
  return c;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface2 p-4">
      <div className="text-xs uppercase tracking-wider text-text2">{label}</div>
      <div className="mt-2 text-2xl text-heading">{value}</div>
    </div>
  );
}

function Chip({ tone, text }: { tone: string; text: string }) {
  const cls =
    tone === "success"
      ? "border-teal/30 bg-teal/10 text-teal"
      : tone === "warning"
        ? "border-primary/30 bg-primary/10 text-primary"
        : tone === "error"
          ? "border-red-500/30 bg-red-500/10 text-red"
          : "border-border bg-surface2 text-text2";
  return (
    <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>{text}</span>
  );
}

function CoveragePill({ level }: { level: "good" | "ok" | "low" }) {
  const cls =
    level === "good"
      ? "bg-teal/15 text-teal border-teal/30"
      : level === "ok"
        ? "bg-primary/15 text-primary border-primary/30"
        : "bg-white/5 text-text2 border-border";
  const label = level === "good" ? "Good" : level === "ok" ? "OK" : "Low";
  return <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>{label}</span>;
}

