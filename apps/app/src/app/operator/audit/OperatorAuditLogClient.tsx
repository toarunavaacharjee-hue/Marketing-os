"use client";

import { useEffect, useMemo, useState } from "react";

type AuditRow = {
  id: string;
  created_at: string;
  operator_user_id: string;
  actor_email?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata_json: unknown;
  before_json: unknown;
  after_json: unknown;
  ip: string | null;
  user_agent: string | null;
};

function JsonViewer({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === "") return null;
  const text =
    typeof value === "string"
      ? value
      : JSON.stringify(value, null, 2);
  return (
    <div className="mt-2">
      <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">{label}</div>
      <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2 text-[11px] text-[var(--text2)] whitespace-pre-wrap break-all">
        {text}
      </pre>
    </div>
  );
}

export default function OperatorAuditLogClient() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);
  const [missingTableMessage, setMissingTableMessage] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setMissingTable(false);
    setMissingTableMessage(null);
    try {
      const res = await fetch("/api/operator/audit-log?limit=200", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        entries?: AuditRow[];
        missing_table?: boolean;
        message?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load audit log.");
      if (data.missing_table) {
        setMissingTable(true);
        setMissingTableMessage(data.message ?? "Audit table is not installed yet.");
      }
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

  const actionOptions = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => seen.add(r.action));
    return ["all", ...Array.from(seen).sort()];
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (actionFilter === "all") return rows;
    return rows.filter((r) => r.action === actionFilter);
  }, [rows, actionFilter]);

  function actorLabel(r: AuditRow) {
    if (r.actor_email) return r.actor_email;
    return r.operator_user_id.slice(0, 8) + "…";
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      {error ? (
        <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
      {missingTable ? (
        <div className="border-b border-[var(--border)] bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <div className="font-semibold">Audit log is not set up yet</div>
          <div className="mt-1 text-xs text-amber-200/90">{missingTableMessage}</div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1.5 text-sm text-[var(--text)]"
          >
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All actions" : a}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--text3)]">
            {loading ? "Loading…" : `${filteredRows.length} entries`}
          </span>
        </div>
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
              <th className="px-3 py-2 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {filteredRows.map((r) => (
              <>
                <tr
                  key={r.id}
                  className="border-t border-[var(--border)] cursor-pointer hover:bg-[var(--surface2)]"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <td className="px-3 py-2 text-xs text-[var(--text3)]">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--text)]">{actorLabel(r)}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--text)]">{r.action}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.target_type}:{r.target_id}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.ip ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-xs text-[var(--color-primary)]">
                      {expandedId === r.id ? "▲ hide" : "▼ show"}
                    </span>
                  </td>
                </tr>
                {expandedId === r.id && (
                  <tr key={`${r.id}-detail`} className="border-t border-[var(--border)] bg-[var(--surface2)]">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <JsonViewer label="Before" value={r.before_json} />
                        <JsonViewer label="After" value={r.after_json} />
                      </div>
                      {r.metadata_json != null && (
                        <JsonViewer label="Metadata" value={r.metadata_json} />
                      )}
                      {r.user_agent && (
                        <div className="mt-2 text-[10px] text-[var(--text3)]">UA: {r.user_agent}</div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--border)] md:hidden">
        {filteredRows.map((r) => (
          <div key={r.id} className="p-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
            >
              <div>
                <div className="text-xs text-[var(--text3)]">{new Date(r.created_at).toLocaleString()}</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">{r.action}</div>
                <div className="mt-1 font-mono text-[11px] text-[var(--text2)]">
                  {r.target_type}:{r.target_id}
                </div>
                <div className="mt-1 text-[11px] text-[var(--text3)]">
                  {actorLabel(r)} · IP: {r.ip ?? "—"}
                </div>
              </div>
              <span className="ml-2 text-xs text-[var(--color-primary)]">
                {expandedId === r.id ? "▲" : "▼"}
              </span>
            </div>
            {expandedId === r.id && (
              <div className="mt-2 border-t border-[var(--border)] pt-2">
                <JsonViewer label="Before" value={r.before_json} />
                <JsonViewer label="After" value={r.after_json} />
                {r.metadata_json != null && <JsonViewer label="Metadata" value={r.metadata_json} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
