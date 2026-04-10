"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OperatorWorkspaceRow = {
  company_id: string;
  company_name: string | null;
  role: string;
};

type OperatorUserRow = {
  id: string;
  email: string | null;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number;
  is_platform_admin: boolean;
  profile_created_at: string | null;
  workspaces?: OperatorWorkspaceRow[];
};

function badge(text: string) {
  return (
    <span className="rounded-[var(--radius2)] border border-[var(--border)] bg-[var(--surface2)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--text3)]">
      {text}
    </span>
  );
}

export default function OperatorUsersClient({ operatorUserId }: { operatorUserId: string }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OperatorUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      return (
        (r.email ?? "").toLowerCase().includes(needle) ||
        (r.name ?? "").toLowerCase().includes(needle) ||
        (r.company ?? "").toLowerCase().includes(needle)
      );
    });
  }, [q, rows]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/operator/users?page=1&perPage=200");
        const data = (await res.json()) as { ok?: boolean; error?: string; users?: OperatorUserRow[] };
        if (!res.ok) throw new Error(data.error ?? "Failed to load users.");
        if (alive) setRows(data.users ?? []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load users.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      {error ? (
        <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-3">
        <div className="text-xs text-[var(--text2)]">{loading ? "Loading…" : `${filtered.length} users`}</div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name, profile company, or workspace"
          className="w-full max-w-[400px] rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)]"
        />
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-[var(--border)] md:hidden">
        {filtered.map((u) => (
          <div key={u.id} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-[var(--text)]">{u.email ?? "—"}</div>
              {u.is_platform_admin ? badge("operator") : null}
            </div>
            <div className="mt-1 text-xs text-[var(--text2)]">
              {(u.name ?? "—") + " · " + (u.company ?? "—")}
            </div>
            <div className="mt-2 text-[11px] text-[var(--text3)]">
              Last sign-in: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}
            </div>
            {u.workspaces?.length ? (
              <div className="mt-2 text-[11px] text-[var(--text2)]">
                <span className="font-semibold text-[var(--text3)]">Workspaces: </span>
                {u.workspaces.map((w, i) => (
                  <span key={w.company_id}>
                    {i > 0 ? " · " : ""}
                    {w.company_name ?? w.company_id.slice(0, 8) + "…"} ({w.role})
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-3 flex justify-end">
              <Link
                href={`/operator/users/${u.id}`}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface3)]"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2 min-w-[220px]">Workspaces</th>
              <th className="px-3 py-2">AI used</th>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Signed up</th>
              <th className="px-3 py-2">Last sign-in</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">{u.email ?? "—"}</td>
                <td className="px-3 py-2">{u.name ?? "—"}</td>
                <td className="px-3 py-2">{u.company ?? "—"}</td>
                <td className="px-3 py-2 align-top text-xs">
                  {u.workspaces?.length ? (
                    <ul className="space-y-1">
                      {u.workspaces.map((w) => (
                        <li key={w.company_id}>
                          <span className="rounded border border-[var(--border)] bg-[var(--surface2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--text3)]">
                            {w.role}
                          </span>{" "}
                          <span className="text-[var(--text)]">{w.company_name ?? "—"}</span>
                          <span className="font-mono text-[10px] text-[var(--text3)]"> {w.company_id.slice(0, 8)}…</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2">{u.ai_queries_used}</td>
                <td className="px-3 py-2">{u.is_platform_admin ? "Yes" : "—"}</td>
                <td className="px-3 py-2 text-xs">{u.auth_created_at ? new Date(u.auth_created_at).toLocaleString() : "—"}</td>
                <td className="px-3 py-2 text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/operator/users/${u.id}`}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-[11px] font-semibold text-[var(--text)] hover:bg-[var(--surface3)]"
                  >
                    View
                  </Link>
                  {u.id === operatorUserId ? (
                    <span className="ml-2 text-[10px] text-[var(--text3)]">You</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

