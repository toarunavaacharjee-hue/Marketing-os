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

  async function seedDemo() {
    setError(null);

    const now = new Date().toISOString();
    const demoSync = [
      { connector: "ga4", status: "success", assets_ingested: 18, is_demo: true, message: "Pulled events + top pages", started_at: now, finished_at: now },
      { connector: "hubspot", status: "warning", assets_ingested: 6, is_demo: true, message: "Rate limit hit; partial import", started_at: now, finished_at: now },
      { connector: "linkedin_ads", status: "success", assets_ingested: 12, is_demo: true, message: "Imported campaigns + creatives", started_at: now, finished_at: now },
      { connector: "meta_ads", status: "error", assets_ingested: 0, is_demo: true, message: "Credentials missing", started_at: now, finished_at: now }
    ];

    const demoAssets = [
      { source: "website", asset_type: "page", title: "/pricing", status: "indexed", is_demo: true },
      { source: "website", asset_type: "page", title: "/compare/acme", status: "stale", is_demo: true },
      { source: "hubspot", asset_type: "deal", title: "Enterprise expansion — Q2", status: "indexed", is_demo: true },
      { source: "hubspot", asset_type: "call_note", title: "Discovery call: RevOps lead", status: "indexed", is_demo: true },
      { source: "linkedin_ads", asset_type: "creative", title: "Carousel: 'Stop guessing ROAS'", status: "indexed", is_demo: true },
      { source: "meta_ads", asset_type: "creative", title: "Retargeting static v2", status: "failed", is_demo: true }
    ].map((a) => ({ ...a, last_seen_at: now }));

    const ins1 = await supabase.from("sync_runs").insert(
      demoSync.map((s) => ({ environment_id: environmentId, ...s }))
    );
    if (ins1.error) {
      setError(ins1.error.message);
      return;
    }

    const ins2 = await supabase.from("assets").insert(
      demoAssets.map((a) => ({ environment_id: environmentId, url: null, ...a }))
    );
    if (ins2.error) {
      setError(ins2.error.message);
      return;
    }

    await load();
  }

  async function clearDemo() {
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
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg text-[#f0f0f8]">Learning & Health</div>
            <div className="mt-1 text-sm text-[#9090b0]">
              See whether the system has enough signal to power each module.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={seedDemo}
              className="rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] hover:bg-white/5"
            >
              Seed demo sync + assets
            </button>
            <button
              onClick={clearDemo}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15"
            >
              Clear demo data
            </button>
          </div>
        </div>

        {syncRuns.some((s) => s.is_demo) || assets.some((a) => a.is_demo) ? (
          <div className="mt-4 rounded-xl border border-[#7c6cff]/30 bg-[#7c6cff]/10 px-3 py-2 text-sm text-[#f0f0f8]">
            Demo data is currently enabled for this product’s Default environment.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? <div className="mt-4 text-sm text-[#9090b0]">Loading…</div> : null}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Stat label="Sources connected (enabled)" value={String(enabledCount(syncRuns))} />
          <Stat label="Assets indexed" value={String(assets.length)} />
          <Stat label="Stale / Failed" value={String(countByStatus(assets, ["stale", "failed"]))} />
          <Stat label="Last sync" value={formatLast(syncRuns[0]?.started_at)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          <div className="text-sm text-[#f0f0f8]">Sync status</div>
          <div className="mt-3 space-y-2">
            {(["ga4", "hubspot", "linkedin_ads", "meta_ads"] as const).map((c) => {
              const latest = syncRuns.find((s) => s.connector === c) ?? null;
              return (
                <div key={c} className="rounded-xl border border-[#2a2e3f] bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#f0f0f8]">{labelConnector(c)}</div>
                    <Chip tone={latest?.status ?? "unknown"} text={latest?.status ?? "unknown"} />
                  </div>
                  <div className="mt-1 text-sm text-[#9090b0]">
                    {latest?.message ?? "No sync run yet."}
                  </div>
                  <div className="mt-2 text-xs text-[#9090b0]">
                    Ingested: <span className="text-[#f0f0f8]">{latest?.assets_ingested ?? 0}</span> •{" "}
                    {formatLast(latest?.started_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          <div className="text-sm text-[#f0f0f8]">Asset ingestion (last seen)</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {Object.entries(countsByType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([type, n]) => (
                <div key={type} className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3">
                  <div className="text-xs uppercase tracking-wider text-[#9090b0]">{type}</div>
                  <div className="mt-1 text-sm text-[#f0f0f8]">{n}</div>
                </div>
              ))}
          </div>
          {assets.length === 0 ? (
            <div className="mt-3 text-sm text-[#9090b0]">No assets indexed yet. Seed demo data to preview.</div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="text-sm text-[#f0f0f8]">Module coverage</div>
        <div className="mt-1 text-sm text-[#9090b0]">
          This is a simple “do we have enough signal?” view. We’ll replace this with real coverage rules once connectors are live.
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m} className="rounded-xl border border-[#2a2e3f] bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-[#f0f0f8]">{m}</div>
                <CoveragePill level={coverageScore(m)} />
              </div>
              <div className="mt-2 text-xs text-[#9090b0]">
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
    <div className="rounded-2xl border border-[#2a2e3f] bg-black/20 p-4">
      <div className="text-xs uppercase tracking-wider text-[#9090b0]">{label}</div>
      <div className="mt-2 text-2xl text-[#f0f0f8]">{value}</div>
    </div>
  );
}

function Chip({ tone, text }: { tone: string; text: string }) {
  const cls =
    tone === "success"
      ? "border-[#b8ff6c]/30 bg-[#b8ff6c]/10 text-[#b8ff6c]"
      : tone === "warning"
        ? "border-[#7c6cff]/30 bg-[#7c6cff]/10 text-[#7c6cff]"
        : tone === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-200"
          : "border-[#2a2e3f] bg-black/20 text-[#9090b0]";
  return (
    <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>{text}</span>
  );
}

function CoveragePill({ level }: { level: "good" | "ok" | "low" }) {
  const cls =
    level === "good"
      ? "bg-[#b8ff6c]/15 text-[#b8ff6c] border-[#b8ff6c]/30"
      : level === "ok"
        ? "bg-[#7c6cff]/15 text-[#7c6cff] border-[#7c6cff]/30"
        : "bg-white/5 text-[#9090b0] border-[#2a2e3f]";
  const label = level === "good" ? "Good" : level === "ok" ? "OK" : "Low";
  return <span className={`rounded-full border px-2 py-1 text-xs ${cls}`}>{label}</span>;
}

