"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getEntitlements } from "@/lib/planEntitlements";

type CompanyMemberRow = {
  user_id: string;
  email: string | null;
  name: string | null;
  role: string;
};

type CompanyRow = {
  id: string;
  public_id: string | null;
  name: string | null;
  members_count: number;
  products_count: number;
  products?: Array<{ id: string; name: string | null; public_id: string | null }>;
  plan: string | null;
  status: string | null;
  seats_included: number | null;
  seats_addon: number | null;
  products_included: number | null;
  products_addon: number | null;
  members: CompanyMemberRow[];
};

const PLAN_OPTIONS = ["starter", "growth", "enterprise"] as const;
const STATUS_OPTIONS = ["trialing", "active", "past_due", "canceled"] as const;

function seatsIncludedFor(plan: string) {
  const p = (plan ?? "starter").toLowerCase();
  if (p === "growth") return 3;
  if (p === "enterprise") return 5;
  return 1;
}

function maxSeatsAddonForPlan(plan: string, seatsIncluded: number): number | undefined {
  const cap = getEntitlements(plan).seatsMax;
  if (cap === null) return undefined;
  return Math.max(0, cap - seatsIncluded);
}

function productsIncludedFor(_plan: string) {
  return 1;
}

function maxProductsAddonForPlan(plan: string, productsIncluded: number): number | undefined {
  const cap = getEntitlements(plan).productsMax;
  if (cap === null) return undefined;
  return Math.max(0, cap - productsIncluded);
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

  async function deleteCompany(c: CompanyRow) {
    const label = c.name?.trim() || c.id;
    const confirm1 = window.prompt(
      `Delete workspace "${label}"? This cannot be undone. Type DELETE to confirm.`
    );
    if ((confirm1 ?? "").trim().toUpperCase() !== "DELETE") return;

    const confirmName = window.prompt(
      `Type the exact workspace name to confirm (copy from the Companies table):`
    );
    if ((confirmName ?? "").trim() !== (c.name ?? "").trim()) {
      setError("Workspace name did not match.");
      return;
    }

    const reasonRaw = window.prompt("Reason for deleting this workspace (required):");
    const reason = (reasonRaw ?? "").trim();
    if (!reason) {
      setError("Reason is required.");
      return;
    }

    setBusyId(c.id);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/operator/delete-company", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company_id: c.id,
          reason,
          confirm_name: (c.name ?? "").trim()
        })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to delete workspace.");
      setRows((prev) => prev.filter((r) => r.id !== c.id));
      setOk("Workspace deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete workspace.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateCompany(
    companyId: string,
    patch: Partial<Pick<CompanyRow, "plan" | "status" | "seats_addon" | "products_addon">>
  ) {
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
      const products_addon =
        typeof patch.products_addon === "number"
          ? patch.products_addon
          : typeof cur?.products_addon === "number"
            ? cur.products_addon
            : 0;

      const reason = window.prompt("Reason for subscription change (required):");
      if (!(reason ?? "").trim()) {
        setError("Reason is required.");
        return;
      }

      const res = await fetch("/api/operator/set-company-subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company_id: companyId, plan, status, seats_addon, products_addon, reason })
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
                seats_included: seatsIncludedFor(plan),
                products_addon,
                products_included: productsIncludedFor(plan)
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
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Workspace ID</th>
              <th className="px-3 py-2 min-w-[320px]">Accounts</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Products</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Seats</th>
              <th className="px-3 py-2">Extra seats</th>
              <th className="px-3 py-2">Product limit</th>
              <th className="px-3 py-2">Extra products</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-[var(--text2)]" colSpan={12}>
                  No workspaces could be loaded. This is usually caused by a missing/mismatched migration (for example
                  `public_id`) or an Operator query error. Apply the latest Supabase migrations, then reload.
                </td>
              </tr>
            ) : null}
            {rows.map((c) => {
              const busy = busyId === c.id;
              const plan = (c.plan ?? "starter").toLowerCase();
              const status = (c.status ?? "active").toLowerCase();
              const included = typeof c.seats_included === "number" ? c.seats_included : seatsIncludedFor(plan);
              const addon = typeof c.seats_addon === "number" ? c.seats_addon : 0;
              const planSeatsCap = getEntitlements(plan).seatsMax;
              const seatsTotal =
                planSeatsCap === null ? included + addon : Math.min(included + addon, planSeatsCap);
              const productsIncluded =
                typeof c.products_included === "number" ? c.products_included : productsIncludedFor(plan);
              const productsAddon = typeof c.products_addon === "number" ? c.products_addon : 0;
              const planProductsCap = getEntitlements(plan).productsMax;
              const productsTotal =
                planProductsCap === null
                  ? productsIncluded + productsAddon
                  : Math.min(productsIncluded + productsAddon, planProductsCap);
              return (
                <tr key={c.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-medium text-[var(--text)]">
                    {c.name ?? "Company"}{" "}
                    <span className="font-mono text-[11px] text-[var(--text3)]">({c.id.slice(0, 8)}…)</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">
                    {c.public_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 align-top text-xs">
                    {c.members?.length ? (
                      <ul className="space-y-1.5">
                        {c.members.map((m) => (
                          <li key={m.user_id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="rounded border border-[var(--border)] bg-[var(--surface2)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--text3)]">
                              {m.role}
                            </span>
                            <Link
                              href={`/operator/users/${m.user_id}`}
                              className="font-mono text-[11px] text-[#a8b4ff] hover:underline"
                            >
                              {m.email ?? m.user_id.slice(0, 8) + "…"}
                            </Link>
                            {m.name ? <span className="text-[var(--text3)]">({m.name})</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-[var(--text3)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{c.members_count}</td>
                  <td className="px-3 py-2">
                    <div className="font-mono text-[12px] text-[var(--text)]">{c.products_count}</div>
                    {c.products?.length ? (
                      <div className="mt-1 text-[10px] text-[var(--text3)]">
                        {c.products
                          .slice(0, 3)
                          .map((p) => p.public_id ?? p.id.slice(0, 8) + "…")
                          .join(" · ")}
                        {c.products.length > 3 ? " …" : ""}
                      </div>
                    ) : null}
                  </td>
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
                      max={maxSeatsAddonForPlan(plan, included)}
                      step={1}
                      defaultValue={addon}
                      disabled={busy}
                      onBlur={(e) => {
                        let n = Math.max(0, Math.floor(Number(e.target.value || "0")));
                        const maxA = maxSeatsAddonForPlan(plan, included);
                        if (typeof maxA === "number") n = Math.min(n, maxA);
                        void updateCompany(c.id, { seats_addon: n });
                      }}
                      className="w-[110px] rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-sm text-[var(--text)] disabled:opacity-60"
                    />
                    <div className="mt-1 text-[10px] text-[var(--text3)]">
                      Included: {included}
                      {planSeatsCap !== null ? ` · Plan cap ${planSeatsCap} seats` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">{productsTotal}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={maxProductsAddonForPlan(plan, productsIncluded)}
                      step={1}
                      defaultValue={productsAddon}
                      disabled={busy}
                      onBlur={(e) => {
                        let n = Math.max(0, Math.floor(Number(e.target.value || "0")));
                        const maxA = maxProductsAddonForPlan(plan, productsIncluded);
                        if (typeof maxA === "number") n = Math.min(n, maxA);
                        void updateCompany(c.id, { products_addon: n });
                      }}
                      className="w-[110px] rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1 text-sm text-[var(--text)] disabled:opacity-60"
                    />
                    <div className="mt-1 text-[10px] text-[var(--text3)]">
                      Included: {productsIncluded}
                      {planProductsCap !== null ? ` · Plan cap ${planProductsCap} total` : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right align-middle">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteCompany(c)}
                      className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? "…" : "Delete workspace"}
                    </button>
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
          const included =
            typeof c.seats_included === "number" ? c.seats_included : seatsIncludedFor(plan);
          const addon = typeof c.seats_addon === "number" ? c.seats_addon : 0;
          const planSeatsCap = getEntitlements(plan).seatsMax;
          const seatsShown =
            planSeatsCap === null ? included + addon : Math.min(included + addon, planSeatsCap);
          const productsIncluded =
            typeof c.products_included === "number" ? c.products_included : productsIncludedFor(plan);
          const productsAddon = typeof c.products_addon === "number" ? c.products_addon : 0;
          const planProductsCap = getEntitlements(plan).productsMax;
          return (
            <div key={c.id} className="p-3">
              <div className="text-sm font-semibold text-[var(--text)]">{c.name ?? "Company"}</div>
              <div className="mt-1 text-xs text-[var(--text2)]">
                Members: {c.members_count} · Products: {c.products_count} · Seats: {seatsShown}
              </div>
              {c.members?.length ? (
                <div className="mt-2 text-xs text-[var(--text2)]">
                  <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Accounts</div>
                  <ul className="mt-1 space-y-1">
                    {c.members.map((m) => (
                      <li key={m.user_id}>
                        <span className="uppercase text-[10px] text-[var(--text3)]">{m.role}</span>{" "}
                        <Link href={`/operator/users/${m.user_id}`} className="text-[#a8b4ff] hover:underline">
                          {m.email ?? m.user_id.slice(0, 8) + "…"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
                    max={maxSeatsAddonForPlan(plan, included)}
                    step={1}
                    defaultValue={addon}
                    disabled={busy}
                    onBlur={(e) => {
                      let n = Math.max(0, Math.floor(Number(e.target.value || "0")));
                      const maxA = maxSeatsAddonForPlan(plan, included);
                      if (typeof maxA === "number") n = Math.min(n, maxA);
                      void updateCompany(c.id, { seats_addon: n });
                    }}
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] disabled:opacity-60"
                  />
                  <div className="mt-1 text-[10px] text-[var(--text3)]">
                    Included: {included}
                    {planSeatsCap !== null ? ` · Cap ${planSeatsCap}` : ""}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-2">
                  <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">Extra products</div>
                  <input
                    type="number"
                    min={0}
                    max={maxProductsAddonForPlan(plan, productsIncluded)}
                    step={1}
                    defaultValue={productsAddon}
                    disabled={busy}
                    onBlur={(e) => {
                      let n = Math.max(0, Math.floor(Number(e.target.value || "0")));
                      const maxA = maxProductsAddonForPlan(plan, productsIncluded);
                      if (typeof maxA === "number") n = Math.min(n, maxA);
                      void updateCompany(c.id, { products_addon: n });
                    }}
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] disabled:opacity-60"
                  />
                  <div className="mt-1 text-[10px] text-[var(--text3)]">
                    Included: {productsIncluded}
                    {planProductsCap !== null ? ` · Plan cap ${planProductsCap} total` : ""}
                  </div>
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
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteCompany(c)}
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete workspace
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

