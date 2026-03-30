"use client";

import { useMemo, useState } from "react";

type Subscriber = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number;
  is_platform_admin: boolean;
  profile_created_at: string | null;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
};

const PLAN_OPTIONS = ["starter", "growth", "enterprise"] as const;

export default function OperatorSubscribersClient({
  initialSubscribers
}: {
  initialSubscribers: Subscriber[];
}) {
  const [rows, setRows] = useState<Subscriber[]>(initialSubscribers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  async function setPlan(userId: string, plan: string) {
    setBusyId(userId);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/operator/set-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to set plan.");
      const cur = byId.get(userId);
      if (cur) {
        setRows((prev) => prev.map((p) => (p.id === userId ? { ...p, plan } : p)));
      }
      setOk("Updated plan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set plan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      {error ? (
        <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
      {ok ? (
        <div className="border-b border-[var(--border)] bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{ok}</div>
      ) : null}
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
          <tr>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Company</th>
            <th className="px-3 py-2">Plan</th>
            <th className="px-3 py-2">AI used</th>
            <th className="px-3 py-2">Operator</th>
            <th className="px-3 py-2">Signed up</th>
            <th className="px-3 py-2">Last sign-in</th>
          </tr>
        </thead>
        <tbody className="text-[var(--text2)]">
          {rows.map((s) => {
            const busy = busyId === s.id;
            const plan = (s.plan ?? "starter").toLowerCase();
            return (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">{s.email ?? "—"}</td>
                <td className="px-3 py-2">{s.name ?? "—"}</td>
                <td className="px-3 py-2">{s.company ?? "—"}</td>
                <td className="px-3 py-2">
                  <select
                    value={PLAN_OPTIONS.includes(plan as any) ? (plan as any) : "starter"}
                    disabled={busy}
                    onChange={(e) => void setPlan(s.id, e.target.value)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-sm text-[var(--text)] disabled:opacity-60"
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">{s.ai_queries_used}</td>
                <td className="px-3 py-2">{s.is_platform_admin ? "Yes" : "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {s.auth_created_at ? new Date(s.auth_created_at).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

