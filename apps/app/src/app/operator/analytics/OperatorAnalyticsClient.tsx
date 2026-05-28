"use client";

import { useEffect, useState } from "react";
import type {
  AnalyticsSummary,
  TrendDay,
  ModuleHeatmapCell,
  TopUser,
  ErrorEntry,
  EventBreakdown
} from "@/app/api/operator/analytics/route";
import type { UserActivitySummary } from "@/app/api/operator/analytics/user/[id]/route";

// ─── helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function heatColor(total: number, max: number): string {
  if (total === 0 || max === 0) return "bg-[var(--surface2)]";
  const pct = total / max;
  if (pct < 0.1) return "bg-[var(--color-primary)]/10";
  if (pct < 0.25) return "bg-[var(--color-primary)]/25";
  if (pct < 0.5) return "bg-[var(--color-primary)]/45";
  if (pct < 0.75) return "bg-[var(--color-primary)]/65";
  return "bg-[var(--color-primary)]/85";
}

function textContrast(total: number, max: number): string {
  const pct = max > 0 ? total / max : 0;
  return pct >= 0.5 ? "text-white" : "text-[var(--text)]";
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent
}: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/8" : "border-[var(--border)] bg-[var(--surface)]"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">{label}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--text)]">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-[var(--text2)]">{sub}</div> : null}
    </div>
  );
}

// ─── sparkline bar chart ──────────────────────────────────────────────────────

function TrendChart({ data }: { data: TrendDay[] }) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-[var(--text)]">14-day activity trend</div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--text3)]">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[var(--color-primary)]/60" /> Events</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-[#00BFA5]/60" /> AI queries</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500/60" /> Errors</span>
        </div>
      </div>
      <div className="flex h-28 items-end gap-1">
        {data.map((d) => (
          <div key={d.day} className="group relative flex flex-1 flex-col items-center gap-0.5">
            <div
              className="w-full rounded-t bg-[var(--color-primary)]/60 transition-all"
              style={{ height: `${Math.round((d.total / maxTotal) * 100)}%`, minHeight: d.total > 0 ? "3px" : "0" }}
            />
            {/* tooltip */}
            <div className="absolute bottom-full mb-1 hidden w-28 rounded-lg border border-[var(--border)] bg-[var(--surface3)] p-2 text-[10px] shadow-lg group-hover:block z-10">
              <div className="font-semibold text-[var(--text)]">{d.day.slice(5)}</div>
              <div className="text-[var(--text2)]">Events: {d.total}</div>
              <div className="text-[#00BFA5]">AI: {d.aiQueries}</div>
              <div className="text-[var(--text2)]">Views: {d.pageViews}</div>
              {d.errors > 0 ? <div className="text-red-400">Errors: {d.errors}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-[var(--text3)]">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

// ─── module heatmap ───────────────────────────────────────────────────────────

function Heatmap({ data }: { data: ModuleHeatmapCell[] }) {
  const maxTotal = Math.max(...data.map((c) => c.total), 1);

  const allModules = [
    { module: "overview", label: "Overview" },
    { module: "market-research", label: "Market Research" },
    { module: "icp-segmentation", label: "ICP Segmentation" },
    { module: "positioning-studio", label: "Positioning Studio" },
    { module: "messaging-artifacts", label: "Messaging Pillars" },
    { module: "artifacts", label: "Artifact Library" },
    { module: "launch-playbook", label: "Launch Playbook" },
    { module: "campaigns", label: "Campaigns" },
    { module: "gtm-planner", label: "GTM Planner" },
    { module: "events", label: "Events" },
    { module: "content-studio", label: "Content Studio" },
    { module: "social-media", label: "Social Media" },
    { module: "design-assets", label: "Design & Assets" },
    { module: "presentations", label: "Presentations" },
    { module: "website-pages", label: "Website & Pages" },
    { module: "analytics", label: "Analytics" },
    { module: "battlecards", label: "Battlecards" },
    { module: "prospect-research", label: "Prospect Research" },
    { module: "sales-intelligence", label: "Sales Intelligence" },
    { module: "customer-insights", label: "Customer Insights" },
    { module: "copilot", label: "AI Copilot" },
  ];

  const dataMap = new Map(data.map((c) => [c.module, c]));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="mb-1 text-sm font-semibold text-[var(--text)]">Module heatmap</div>
      <div className="mb-3 flex items-center gap-4 text-[10px] text-[var(--text3)]">
        <span>30-day page views + AI queries per module. Darker = more usage.</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-[var(--surface2)] border border-[var(--border)]" />
          <span>0</span>
          <span className="ml-1 inline-block h-3 w-3 rounded-sm bg-[var(--color-primary)]/25" />
          <span className="ml-1 inline-block h-3 w-3 rounded-sm bg-[var(--color-primary)]/45" />
          <span className="ml-1 inline-block h-3 w-3 rounded-sm bg-[var(--color-primary)]/65" />
          <span className="ml-1 inline-block h-3 w-3 rounded-sm bg-[var(--color-primary)]/85" />
          <span>high</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {allModules.map(({ module, label }) => {
          const cell = dataMap.get(module);
          const total = cell?.total ?? 0;
          const bg = heatColor(total, maxTotal);
          const tc = textContrast(total, maxTotal);
          return (
            <div
              key={module}
              title={`${label}\nEvents: ${total}\nUnique users: ${cell?.uniqueUsers ?? 0}\nAI queries: ${cell?.aiQueries ?? 0}\nErrors: ${cell?.errors ?? 0}\nLast used: ${cell?.lastUsed ? relTime(cell.lastUsed) : "never"}`}
              className={`group relative rounded-lg p-2 transition ${bg}`}
            >
              <div className={`text-[10px] font-semibold leading-tight ${tc} opacity-90`}>{label}</div>
              <div className={`mt-1 text-[13px] font-bold ${tc}`}>{total > 0 ? total.toLocaleString() : "—"}</div>
              {cell && total > 0 ? (
                <div className={`text-[9px] ${tc} opacity-70`}>{cell.uniqueUsers}u · {cell.aiQueries}ai</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── user activity drawer ─────────────────────────────────────────────────────

function UserActivityDrawer({ userId, email, onClose }: { userId: string; email: string | null; onClose: () => void }) {
  const [data, setData] = useState<UserActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/operator/analytics/user/${userId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  const EVENT_ICON: Record<string, string> = {
    page_view: "👁", ai_query: "🤖", ai_error: "⚠️", login: "🔑",
    quota_exceeded: "🚫", feature_error: "❌", document_upload: "📄",
    export: "📤", research_scan: "🔍", prospect_research: "🎯",
    segment_extract: "📊", battlecard_generate: "🛡", positioning_generate: "⚡",
    event_extract: "📅"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="relative mt-0 h-screen w-full max-w-lg overflow-y-auto border-l border-[var(--border)] bg-[var(--bg)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--text3)] hover:bg-[var(--surface2)]">✕</button>
        <div className="pr-8">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text3)]">User activity (30d)</div>
          <div className="mt-1 font-semibold text-[var(--text)]">{email ?? userId.slice(0, 12) + "…"}</div>

          {loading ? (
            <div className="mt-6 text-sm text-[var(--text2)]">Loading…</div>
          ) : !data ? (
            <div className="mt-6 text-sm text-[var(--text2)]">No activity data found.</div>
          ) : (
            <>
              {/* stat row */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[
                  { label: "Events", val: data.total },
                  { label: "AI runs", val: data.aiQueries },
                  { label: "Views", val: data.pageViews },
                  { label: "Errors", val: data.errors }
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 text-center">
                    <div className="text-[10px] text-[var(--text3)]">{label}</div>
                    <div className="mt-0.5 text-lg font-bold text-[var(--text)]">{val}</div>
                  </div>
                ))}
              </div>

              {/* module breakdown */}
              {data.moduleBreakdown.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold text-[var(--text2)]">Module usage</div>
                  <div className="space-y-1">
                    {data.moduleBreakdown.slice(0, 10).map((m) => {
                      const maxMod = data.moduleBreakdown[0]?.total ?? 1;
                      return (
                        <div key={m.module} className="flex items-center gap-2">
                          <div className="w-28 shrink-0 truncate text-[11px] text-[var(--text2)]">{m.label}</div>
                          <div className="relative flex-1 rounded-full bg-[var(--surface2)] h-2">
                            <div
                              className="absolute left-0 top-0 h-2 rounded-full bg-[var(--color-primary)]/60"
                              style={{ width: `${Math.round((m.total / maxMod) * 100)}%` }}
                            />
                          </div>
                          <div className="w-8 text-right text-[11px] font-semibold text-[var(--text)]">{m.total}</div>
                          {m.aiQueries > 0 ? <div className="text-[10px] text-[#00BFA5]">+{m.aiQueries}ai</div> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* timeline */}
              <div className="mt-4">
                <div className="mb-2 text-xs font-semibold text-[var(--text2)]">Activity timeline</div>
                <div className="space-y-1">
                  {data.recentActivity.slice(0, 80).map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-[11px] ${entry.status === "error" ? "bg-red-500/10" : "bg-[var(--surface)]"}`}
                    >
                      <span className="mt-0.5 text-sm">{EVENT_ICON[entry.event] ?? "•"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[var(--text)]">{entry.event.replace(/_/g, " ")}</span>
                          {entry.module ? <span className="rounded bg-[var(--surface2)] px-1.5 py-0.5 text-[10px] text-[var(--text3)]">{entry.module}</span> : null}
                          {entry.durationMs ? <span className="text-[var(--text3)]">{entry.durationMs}ms</span> : null}
                        </div>
                        {entry.errorMessage ? <div className="mt-0.5 text-red-400 truncate">{entry.errorMessage}</div> : null}
                      </div>
                      <div className="shrink-0 text-[var(--text3)]">{relTime(entry.createdAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main client ──────────────────────────────────────────────────────────────

export default function OperatorAnalyticsClient() {
  const [data, setData] = useState<(AnalyticsSummary & { missingTable?: boolean }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; email: string | null } | null>(null);
  const [tab, setTab] = useState<"errors" | "events">("errors");

  useEffect(() => {
    fetch("/api/operator/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text2)]">Loading analytics…</div>;
  }

  if (error) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>;
  }

  if (data?.missingTable) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-[var(--text)]">
        <div className="font-semibold text-amber-400">Activity log table not installed</div>
        <p className="mt-1 text-[var(--text2)]">
          Run <code className="rounded bg-[var(--surface2)] px-1.5 py-0.5 text-[11px]">supabase/activity_log.sql</code> in
          your Supabase SQL Editor to create the table, then reload.
        </p>
      </div>
    );
  }

  if (!data) return null;

  const errorBadge = data.errorRate >= 5 ? "bg-red-500/20 text-red-400" : data.errorRate >= 1 ? "bg-amber-500/20 text-amber-400" : "bg-teal-500/20 text-teal-400";

  return (
    <>
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="DAU" value={data.dau} sub="Active today" accent />
        <StatCard label="WAU" value={data.wau} sub="Active 7 days" />
        <StatCard label="MAU" value={data.mau} sub="Active 30 days" />
        <StatCard label="AI queries (30d)" value={data.aiQueries30d} sub="Across all modules" />
        <StatCard label="Page views (30d)" value={data.pageViews30d} />
        <div className={`rounded-xl border p-4 ${errorBadge.includes("red") ? "border-red-500/30" : errorBadge.includes("amber") ? "border-amber-500/30" : "border-teal-500/30"}`}>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">Error rate (30d)</div>
          <div className="mt-1 text-2xl font-bold text-[var(--text)]">{data.errorRate}%</div>
          <div className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${errorBadge}`}>
            {data.errorRate >= 5 ? "High" : data.errorRate >= 1 ? "Moderate" : "Healthy"}
          </div>
        </div>
      </div>

      {/* 14-day trend chart */}
      {data.trend.length > 0 ? <TrendChart data={data.trend} /> : null}

      {/* Module heatmap */}
      <Heatmap data={data.heatmap} />

      {/* Bottom two-column layout */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Top users */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-3 text-sm font-semibold text-[var(--text)]">Top users (30d)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--text3)]">
                  <th className="pb-2 pr-3 font-medium">User</th>
                  <th className="pb-2 pr-2 text-right font-medium">Events</th>
                  <th className="pb-2 pr-2 text-right font-medium">AI</th>
                  <th className="pb-2 pr-2 text-right font-medium">Views</th>
                  <th className="pb-2 pr-2 text-right font-medium text-red-400">Err</th>
                  <th className="pb-2 text-right font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {(data.topUsers as TopUser[]).map((u) => (
                  <tr
                    key={u.userId}
                    className="cursor-pointer border-b border-[var(--border)] transition last:border-0 hover:bg-[var(--surface2)]"
                    onClick={() => setSelectedUser({ userId: u.userId, email: u.email })}
                  >
                    <td className="py-2 pr-3">
                      <div className="truncate max-w-[130px] font-medium text-[var(--text)]">{u.email ?? u.userId.slice(0, 12) + "…"}</div>
                      {u.name ? <div className="text-[10px] text-[var(--text3)] truncate max-w-[130px]">{u.name}</div> : null}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold text-[var(--text)]">{u.total}</td>
                    <td className="py-2 pr-2 text-right text-[#00BFA5]">{u.aiQueries}</td>
                    <td className="py-2 pr-2 text-right text-[var(--text2)]">{u.pageViews}</td>
                    <td className={`py-2 pr-2 text-right ${u.errors > 0 ? "text-red-400" : "text-[var(--text3)]"}`}>{u.errors || "—"}</td>
                    <td className="py-2 text-right text-[var(--text3)]">{u.lastActive ? relTime(u.lastActive) : "—"}</td>
                  </tr>
                ))}
                {data.topUsers.length === 0 ? (
                  <tr><td colSpan={6} className="py-4 text-center text-[var(--text3)]">No activity yet</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-[10px] text-[var(--text3)]">Click a row to see full activity timeline →</div>
        </div>

        {/* Errors + event breakdown tabs */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-3 flex items-center gap-2">
            {(["errors", "events"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tab === t ? "bg-[var(--color-primary)] text-white" : "bg-[var(--surface2)] text-[var(--text2)] hover:bg-[var(--surface3)]"}`}
              >
                {t === "errors" ? `Errors (${data.recentErrors.length})` : "Event breakdown"}
              </button>
            ))}
          </div>

          {tab === "errors" ? (
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {(data.recentErrors as ErrorEntry[]).slice(0, 50).map((e) => (
                <div
                  key={e.id}
                  className="cursor-pointer rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 hover:bg-red-500/15 transition"
                  onClick={() => setSelectedUser({ userId: e.userId, email: e.email })}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[var(--surface2)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text3)]">
                        {e.event.replace(/_/g, " ")}
                      </span>
                      {e.module ? (
                        <span className="text-[10px] text-[var(--text3)]">{e.module}</span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-[var(--text3)]">{fmtDate(e.createdAt)}</div>
                  </div>
                  {e.errorMessage ? (
                    <div className="mt-0.5 truncate text-[11px] text-red-400">{e.errorMessage}</div>
                  ) : null}
                  <div className="mt-0.5 text-[10px] text-[var(--text3)] truncate">{e.email ?? e.userId.slice(0, 16) + "…"}</div>
                </div>
              ))}
              {data.recentErrors.length === 0 ? (
                <div className="py-6 text-center text-sm text-[#00BFA5]">No errors in last 30 days 🎉</div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {(data.eventBreakdown as EventBreakdown[]).map((e) => {
                const maxEvt = data.eventBreakdown[0]?.total ?? 1;
                return (
                  <div key={e.event} className="flex items-center gap-3">
                    <div className="w-32 shrink-0 truncate text-[11px] font-medium text-[var(--text2)]">
                      {e.event.replace(/_/g, " ")}
                    </div>
                    <div className="relative flex-1 h-2 rounded-full bg-[var(--surface2)]">
                      <div
                        className="absolute left-0 top-0 h-2 rounded-full bg-[var(--color-primary)]/60"
                        style={{ width: `${Math.round((e.total / maxEvt) * 100)}%` }}
                      />
                    </div>
                    <div className="w-10 text-right text-[11px] font-semibold text-[var(--text)]">
                      {e.total.toLocaleString()}
                    </div>
                  </div>
                );
              })}
              {data.eventBreakdown.length === 0 ? (
                <div className="py-6 text-center text-sm text-[var(--text2)]">No events recorded yet</div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Per-user drawer */}
      {selectedUser ? (
        <UserActivityDrawer
          userId={selectedUser.userId}
          email={selectedUser.email}
          onClose={() => setSelectedUser(null)}
        />
      ) : null}
    </>
  );
}
