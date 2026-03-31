"use client";

import { useMemo, useState } from "react";

type Subscriber = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  ai_queries_used: number;
  is_platform_admin: boolean;
  profile_created_at: string | null;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
};

export default function OperatorSubscribersClient({
  initialSubscribers
}: {
  initialSubscribers: Subscriber[];
}) {
  const [rows, setRows] = useState<Subscriber[]>(initialSubscribers);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

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
                {(s.name ?? "—") + " · " + (s.company ?? "—")}
              </div>
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
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">AI used</th>
              <th className="px-3 py-2">Operator</th>
              <th className="px-3 py-2">Signed up</th>
              <th className="px-3 py-2">Last sign-in</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {rows.map((s) => {
              return (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">{s.email ?? "—"}</td>
                  <td className="px-3 py-2">{s.name ?? "—"}</td>
                  <td className="px-3 py-2">{s.company ?? "—"}</td>
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
    </div>
  );
}

