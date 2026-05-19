"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type HubSpotSnapshot = {
  synced_at: string;
  contacts_count: number;
  deals_count: number;
  top_industries: string[];
  deal_stages: Array<{ stage: string; count: number; total_value: number }>;
  avg_deal_value: number;
  contacts_sample: Array<{ name: string; title: string; company: string; industry: string }>;
  deals_sample: Array<{ name: string; stage: string; value: number; probability: number }>;
};

type CsvImportType = "contacts" | "deals" | "reviews" | "competitors";

type ImportState = {
  loading: boolean;
  success: string | null;
  error: string | null;
};

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className="text-lg font-semibold text-text">{value}</div>
      <div className="mt-0.5 text-[11px] text-text3">{label}</div>
    </div>
  );
}

const IMPORT_CONFIGS: Array<{ type: CsvImportType; label: string }> = [
  { type: "contacts", label: "Import Contacts CSV" },
  { type: "deals", label: "Import Deals CSV" },
  { type: "reviews", label: "Import Reviews CSV" },
  { type: "competitors", label: "Import Competitors CSV" }
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

export function DataSourcesPanel({ environmentId }: { environmentId: string }) {
  const [snapshot, setSnapshot] = useState<HubSpotSnapshot | null>(null);
  const [hubspotLoading, setHubspotLoading] = useState(false);
  const [hubspotError, setHubspotError] = useState<string | null>(null);
  const [hubspotNotConfigured, setHubspotNotConfigured] = useState(false);

  const [importStates, setImportStates] = useState<Record<CsvImportType, ImportState>>({
    contacts: { loading: false, success: null, error: null },
    deals: { loading: false, success: null, error: null },
    reviews: { loading: false, success: null, error: null },
    competitors: { loading: false, success: null, error: null }
  });

  const fileRefs = {
    contacts: useRef<HTMLInputElement>(null),
    deals: useRef<HTMLInputElement>(null),
    reviews: useRef<HTMLInputElement>(null),
    competitors: useRef<HTMLInputElement>(null)
  };

  async function syncHubspot() {
    setHubspotLoading(true);
    setHubspotError(null);
    setHubspotNotConfigured(false);
    try {
      const res = await fetch("/api/integrations/hubspot/sync", { method: "POST" });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const data = contentType.includes("application/json")
        ? (JSON.parse(raw) as { error?: string; code?: string } & Partial<HubSpotSnapshot>)
        : ({ error: raw || "Server error" } as { error: string });
      if (!res.ok) {
        if ("code" in data && data.code === "NOT_CONFIGURED") {
          setHubspotNotConfigured(true);
        } else {
          setHubspotError((data as { error?: string }).error ?? "Sync failed.");
        }
        return;
      }
      setSnapshot(data as HubSpotSnapshot);
    } catch (e) {
      setHubspotError(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setHubspotLoading(false);
    }
  }

  function updateImportState(type: CsvImportType, patch: Partial<ImportState>) {
    setImportStates((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  async function handleFileChange(type: CsvImportType, file: File) {
    updateImportState(type, { loading: true, success: null, error: null });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      const res = await fetch("/api/integrations/csv-import", {
        method: "POST",
        body: formData
      });
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const data = contentType.includes("application/json")
        ? (JSON.parse(raw) as { imported?: number; type?: string; summary?: string; error?: string })
        : ({ error: raw || "Server error" } as { error: string });
      if (!res.ok) {
        updateImportState(type, { loading: false, error: data.error ?? "Import failed." });
        return;
      }
      updateImportState(type, {
        loading: false,
        success: `Imported ${data.imported ?? 0} rows — ${data.summary ?? `${type} data added to your research`}`
      });
    } catch (e) {
      updateImportState(type, {
        loading: false,
        error: e instanceof Error ? e.message : "Import failed."
      });
    }
    // Reset file input so the same file can be re-imported
    const ref = fileRefs[type];
    if (ref.current) ref.current.value = "";
  }

  const totalPipelineValue = snapshot?.deal_stages.reduce((s, d) => s + d.total_value, 0) ?? 0;

  return (
    <div className="saas-card p-5 space-y-5">
      {/* ── CRM Integration ── */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3 mb-3">
          CRM Integration
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={syncHubspot}
            disabled={hubspotLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A59] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e86744] disabled:opacity-60"
          >
            {hubspotLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Syncing…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <circle cx="7" cy="7" r="6.5" stroke="currentColor" />
                  <path d="M4.5 7h5M7 4.5l2.5 2.5L7 9.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sync HubSpot
              </>
            )}
          </button>

          {snapshot ? (
            <span className="text-[12px] text-text3">
              Last synced {formatDate(snapshot.synced_at)}
            </span>
          ) : null}
        </div>

        {hubspotNotConfigured ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-text2">
            <span>HubSpot not configured.</span>
            <Link
              href="/dashboard/settings/integrations"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Configure in Settings → Integrations
            </Link>
          </div>
        ) : null}

        {hubspotError ? (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
            {hubspotError}
          </div>
        ) : null}

        {snapshot ? (
          <div className="mt-3 rounded-xl border border-border bg-surface2 p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Contacts" value={String(snapshot.contacts_count)} />
              <StatTile label="Deals" value={String(snapshot.deals_count)} />
              <StatTile label="Avg Deal" value={formatCurrency(snapshot.avg_deal_value)} />
              <StatTile label="Pipeline" value={formatCurrency(totalPipelineValue)} />
            </div>

            {snapshot.top_industries.length > 0 ? (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text3 mb-1.5">
                  Top Industries
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {snapshot.top_industries.map((ind) => (
                    <span
                      key={ind}
                      className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {snapshot.deal_stages.length > 0 ? (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text3 mb-1.5">
                  Deal Stages
                </div>
                <div className="space-y-1">
                  {snapshot.deal_stages.slice(0, 5).map((s) => (
                    <div key={s.stage} className="flex items-center justify-between text-[12px]">
                      <span className="text-text2">{s.stage}</span>
                      <span className="font-medium text-text">
                        {s.count} deal{s.count !== 1 ? "s" : ""} · {formatCurrency(s.total_value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* ── Import Data ── */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text3 mb-3">
          Import Data
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {IMPORT_CONFIGS.map(({ type, label }) => {
            const state = importStates[type];
            return (
              <div key={type} className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileRefs[type].current?.click()}
                  disabled={state.loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface2 px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface3 hover:border-border disabled:opacity-60"
                >
                  {state.loading ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {label}
                    </>
                  )}
                </button>

                <input
                  ref={fileRefs[type]}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileChange(type, file);
                  }}
                />

                {state.success ? (
                  <p className="text-[11px] leading-4 text-teal">{state.success}</p>
                ) : null}
                {state.error ? (
                  <p className="text-[11px] leading-4 text-red">{state.error}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
