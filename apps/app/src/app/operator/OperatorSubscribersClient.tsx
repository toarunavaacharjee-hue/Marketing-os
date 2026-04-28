"use client";

import { useState } from "react";

type Subscriber = {
  id: string;
  email: string | null;
  name: string | null;
  display_name?: string | null;
  company: string | null;
  job_title?: string | null;
  ai_queries_used: number;
  is_platform_admin: boolean;
  profile_created_at: string | null;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
};

export default function OperatorSubscribersClient({
  initialSubscribers,
  operatorUserId
}: {
  initialSubscribers: Subscriber[];
  operatorUserId: string;
}) {
  const [rows, setRows] = useState<Subscriber[]>(initialSubscribers);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deleteUser(target: Subscriber) {
    if (!operatorUserId) return;
    if (target.id === operatorUserId) {
      setError("You cannot delete your own account.");
      return;
    }
    if (target.is_platform_admin) {
      setError("Remove platform admin in Supabase (profiles.is_platform_admin) before deleting this user.");
      return;
    }
    const label = target.email ?? target.id;
    const confirmLabel = window.prompt(`Type DELETE to confirm deleting user ${label}. This cannot be undone.`);
    if ((confirmLabel ?? "").trim().toUpperCase() !== "DELETE") return;
    const reason = window.prompt("Reason for deletion (required):");
    if (!(reason ?? "").trim()) {
      setError("Reason is required.");
      return;
    }

    setBusyId(target.id);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/operator/delete-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: target.id, reason })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed.");
      setRows((prev) => prev.filter((r) => r.id !== target.id));
      setOk("User deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyId(null);
    }
  }

  // Profiles.plan is now legacy; company_subscriptions is the source of truth.
  // This table remains useful for subscriber discovery + AI usage.

  return (
    <div className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      {error ? (
        <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
      {ok ? (
        <div className="border-b border-[var(--border)] bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{ok}</div>
      ) : null}

      {/* Mobile cards */}
      <div className="divide-y divide-[var(--border)] md:hidden">
        {rows.map((s) => {
          return (
            <div key={s.id} className="p-3">
              <div className="text-sm font-semibold text-[var(--text)]">{s.email ?? "—"}</div>
              <div className="mt-1 text-xs text-[var(--text2)]">
                {(s.display_name ?? s.name ?? "—") + " · " + (s.job_title ?? "—")}
              </div>
              <div className="mt-1 text-xs text-[var(--text3)]">{s.company ?? "—"}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text2)]">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2">
                  <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">AI used</div>
                  <div className="mt-1 text-sm text-[var(--text)]">{s.ai_queries_used}</div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2">
                  <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Operator</div>
                  <div className="mt-1 text-sm text-[var(--text)]">{s.is_platform_admin ? "Yes" : "—"}</div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-[var(--text3)]">
                Signed up: {s.auth_created_at ? new Date(s.auth_created_at).toLocaleString() : "—"}
                {" · "}
                Last sign-in: {s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : "—"}
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={
                    busyId === s.id ||
                    s.id === operatorUserId ||
                    s.is_platform_admin
                  }
                  onClick={() => void deleteUser(s)}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyId === s.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">AI used</th>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Signed up</th>
              <th className="px-3 py-2">Last sign-in</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {rows.map((s) => {
              return (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">{s.email ?? "—"}</td>
                  <td className="px-3 py-2">{s.display_name ?? s.name ?? "—"}</td>
                  <td className="px-3 py-2">{s.job_title ?? "—"}</td>
                  <td className="px-3 py-2">{s.company ?? "—"}</td>
                  <td className="px-3 py-2">{s.ai_queries_used}</td>
                  <td className="px-3 py-2">{s.is_platform_admin ? "Yes" : "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.auth_created_at ? new Date(s.auth_created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={
                        busyId === s.id ||
                        s.id === operatorUserId ||
                        s.is_platform_admin
                      }
                      onClick={() => void deleteUser(s)}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === s.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

