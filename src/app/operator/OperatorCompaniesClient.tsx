"use client";

import { useMemo, useState } from "react";

type CompanyRow = {
  id: string;
  name: string | null;
  members_count: number;
  plan: string | null;
  status: string | null;
  seats_included: number | null;
  seats_addon: number | null;
};

const PLAN_OPTIONS = ["starter", "growth", "enterprise"] as const;
const STATUS_OPTIONS = ["trialing", "active", "past_due", "canceled"] as const;

function seatsIncludedFor(plan: string) {
  const p = (plan ?? "starter").toLowerCase();
  if (p === "growth") return 5;
  if (p === "enterprise") return 10;
  return 1;
}

export default function OperatorCompaniesClient({
  initialCompanies
}: {
  initialCompanies: CompanyRow[];
}) {
  const [rows, setRows] = useState<CompanyRow[]>(initialCompanies);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  async function updateCompany(companyId: string, patch: Partial<Pick<CompanyRow, "plan" | "status" | "seats_addon">>) {
    setBusyId(companyId);
    setError(null);
    setOk(null);
    try {
      const cur = byId.get(companyId);
      const plan = (patch.plan ?? cur?.plan ?? "starter").toLowerCase();
      const status = (patch.status ?? cur?.status ?? "active").toLowerCase();
      const seats_addon =
        typeof patch.seats_addon === "number"
          ? patch.seats_addon
          : typeof cur?.seats_addon === "number"
            ? cur.seats_addon
            : 0;

      const res = await fetch("/api/operator/set-company-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company_id: companyId, plan, status, seats_addon })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to update company subscription.");

      setRows((prev) =>
        prev.map((r) =>
          r.id === companyId
            ? {
                ...r,
                plan,
                status,
                seats_addon,
                seats_included: seatsIncludedFor(plan)
              }
            : r
        )
      );
      setOk("Updated company subscription.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update company subscription.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      {error ? (
        <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
      {ok ? (
        <div className="border-b border-[var(--border)] bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{ok}</div>
      ) : null}

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Seats</th>
              <th className="px-3 py-2">Extra seats</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {rows.map((c) => {
              const busy = busyId === c.id;
              const plan = (c.plan ?? "starter").toLowerCase();
              const status = (c.status ?? "active").toLowerCase();
              const included = seatsIncludedFor(plan);
              const addon = typeof c.seats_addon === "number" ? c.seats_addon : 0;
              const seatsTotal = included + addon;
              return (
                <tr key={c.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-medium text-[var(--text)]">
                    {c.name ?? "Company"}{" "}
                    <span className="font-mono text-[11px] text-[var(--text3)]">({c.id.slice(0, 8)}…)</span>
                  </td>
                  <td className="px-3 py-2">{c.members_count}</td>
                  <td className="px-3 py-2">
                    <select
                      value={PLAN_OPTIONS.includes(plan as any) ? (plan as any) : "starter"}
                      disabled={busy}
                      onChange={(e) => void updateCompany(c.id, { plan: e.target.value })}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-sm text-[var(--text)] disabled:opacity-60"
                    >
                      {PLAN_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={STATUS_OPTIONS.includes(status as any) ? (status as any) : "active"}
                      disabled={busy}
                      onChange={(e) => void updateCompany(c.id, { status: e.target.value })}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-sm text-[var(--text)] disabled:opacity-60"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">{seatsTotal}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={addon}
                      disabled={busy}
                      onBlur={(e) => {
                        const n = Math.max(0, Math.floor(Number(e.target.value || "0")));
                        void updateCompany(c.id, { seats_addon: n });
                      }}
                      className="w-[110px] rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-sm text-[var(--text)] disabled:opacity-60"
                    />
                    <div className="mt-1 text-[10px] text-[var(--text3)]">Included: {included}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-[var(--border)] md:hidden">
        {rows.map((c) => {
          const busy = busyId === c.id;
          const plan = (c.plan ?? "starter").toLowerCase();
          const status = (c.status ?? "active").toLowerCase();
          const included = seatsIncludedFor(plan);
          const addon = typeof c.seats_addon === "number" ? c.seats_addon : 0;
          return (
            <div key={c.id} className="p-3">
              <div className="text-sm font-semibold text-[var(--text)]">{c.name ?? "Company"}</div>
              <div className="mt-1 text-xs text-[var(--text2)]">
                Members: {c.members_count} · Seats: {included + addon}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text2)]">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2">
                  <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Plan</div>
                  <select
                    value={PLAN_OPTIONS.includes(plan as any) ? (plan as any) : "starter"}
                    disabled={busy}
                    onChange={(e) => void updateCompany(c.id, { plan: e.target.value })}
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] disabled:opacity-60"
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2">
                  <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Extra seats</div>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={addon}
                    disabled={busy}
                    onBlur={(e) => {
                      const n = Math.max(0, Math.floor(Number(e.target.value || "0")));
                      void updateCompany(c.id, { seats_addon: n });
                    }}
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] disabled:opacity-60"
                  />
                  <div className="mt-1 text-[10px] text-[var(--text3)]">Included: {included}</div>
                </div>
              </div>
              <div className="mt-2">
                <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Status</div>
                <select
                  value={STATUS_OPTIONS.includes(status as any) ? (status as any) : "active"}
                  disabled={busy}
                  onChange={(e) => void updateCompany(c.id, { status: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

