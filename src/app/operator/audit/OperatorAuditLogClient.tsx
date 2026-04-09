"use client";

import { useEffect, useState } from "react";

type AuditRow = {
  id: string;
  created_at: string;
  operator_user_id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata_json: unknown;
  before_json: unknown;
  after_json: unknown;
  ip: string | null;
  user_agent: string | null;
};

export default function OperatorAuditLogClient() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/operator/audit-log?limit=200", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; error?: string; entries?: AuditRow[] };
      if (!res.ok) throw new Error(data.error ?? "Failed to load audit log.");
      setRows(data.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      {error ? (
        <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-3">
        <div className="text-xs text-[var(--text2)]">{loading ? "Loading…" : `${rows.length} entries`}</div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface3)]"
        >
          Refresh
        </button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 text-xs text-[var(--text3)]">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-[var(--text)]">{r.operator_user_id.slice(0, 8)}…</td>
                <td className="px-3 py-2 font-mono text-[11px] text-[var(--text)]">{r.action}</td>
                <td className="px-3 py-2 text-xs">
                  {r.target_type}:{r.target_id}
                </td>
                <td className="px-3 py-2 text-xs">{r.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--border)] md:hidden">
        {rows.map((r) => (
          <div key={r.id} className="p-3">
            <div className="text-xs text-[var(--text3)]">{new Date(r.created_at).toLocaleString()}</div>
            <div className="mt-1 text-sm font-semibold text-[var(--text)]">{r.action}</div>
            <div className="mt-1 font-mono text-[11px] text-[var(--text2)]">
              {r.target_type}:{r.target_id}
            </div>
            <div className="mt-2 text-[11px] text-[var(--text3)]">
              Actor: {r.operator_user_id.slice(0, 8)}… · IP: {r.ip ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

