"use client";

import { useEffect, useMemo, useState } from "react";

type MembershipRow = { company_id: string; role: string; companies?: { name?: string | null } | null };
type SubscriptionRow = {
  company_id: string;
  plan: string | null;
  status: string | null;
  seats_included: number | null;
  seats_addon: number | null;
  products_included: number | null;
  products_addon: number | null;
};
type JobRow = {
  id: string;
  status: string;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
  created_at: string;
  input_json: any;
};

type DetailResponse = {
  ok?: boolean;
  error?: string;
  auth_user?: { id: string; email?: string | null; created_at?: string | null; last_sign_in_at?: string | null } | null;
  profile?: {
    id: string;
    name: string | null;
    display_name?: string | null;
    company: string | null;
    job_title?: string | null;
    phone?: string | null;
    timezone?: string | null;
    locale?: string | null;
    avatar_url?: string | null;
    plan: string | null;
    ai_queries_used: number | null;
    is_platform_admin: boolean | null;
    created_at: string | null;
  } | null;
  memberships?: MembershipRow[];
  company_subscriptions?: SubscriptionRow[];
  prospect_research_jobs?: JobRow[];
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] p-3">
      <div className="text-[10px] font-semibold uppercase text-[var(--text3)]">{label}</div>
      <div className="mt-1 font-mono text-[12px] text-[var(--text)]">{value}</div>
    </div>
  );
}

export default function OperatorUserDetailClient({ userId }: { userId: string }) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const isSuspended = useMemo(() => {
    // Supabase returns `banned_until` on the user object (not included in our type). If present, treat as suspended.
    const anyUser = (data as any)?.auth_user as any;
    const bannedUntil = anyUser?.banned_until;
    if (!bannedUntil) return false;
    return new Date(String(bannedUntil)).getTime() > Date.now();
  }, [data]);

  async function load() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/operator/users/${encodeURIComponent(userId)}`, { cache: "no-store" });
      const j = (await res.json()) as DetailResponse;
      if (!res.ok) throw new Error((j as any).error ?? "Failed to load user.");
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function post(path: string, label: string, body: any) {
    const r = reason.trim();
    if (!r) {
      setError("Reason is required for operator actions.");
      return;
    }
    setBusy(label);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, reason: r })
      });
      const j = (await res.json()) as any;
      if (!res.ok) throw new Error(j.error ?? "Action failed.");
      setOk("Action completed.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteUser() {
    const r = reason.trim();
    if (!r) {
      setError("Reason is required for operator actions.");
      return;
    }
    if (!window.confirm("Permanently delete this user? This cannot be undone.")) return;
    setBusy("delete");
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/operator/delete-user", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: userId, reason: r })
      });
      const j = (await res.json()) as any;
      if (!res.ok) throw new Error(j.error ?? "Delete failed.");
      setOk("User deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  const profile = data?.profile ?? null;
  const authUser = (data as any)?.auth_user ?? null;
  const memberships = data?.memberships ?? [];
  const subs = data?.company_subscriptions ?? [];
  const jobs = data?.prospect_research_jobs ?? [];

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        {error ? (
          <div className="border-b border-[var(--border)] bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        ) : null}
        {ok ? (
          <div className="border-b border-[var(--border)] bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{ok}</div>
        ) : null}

        <div className="border-b border-[var(--border)] px-3 py-3">
          <div className="text-sm font-semibold text-[var(--text)]">Summary</div>
          <div className="mt-1 text-xs text-[var(--text2)]">Provide a reason before running any action.</div>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Email" value={authUser?.email ?? "—"} />
          <Stat label="Name" value={profile?.name ?? "—"} />
          <Stat label="Display name" value={profile?.display_name ?? "—"} />
          <Stat label="Company (profile)" value={profile?.company ?? "—"} />
          <Stat label="AI used" value={String(profile?.ai_queries_used ?? 0)} />
        </div>

        <div className="grid gap-3 border-t border-[var(--border)] p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Job title" value={profile?.job_title ?? "—"} />
          <Stat label="Phone" value={profile?.phone ?? "—"} />
          <Stat label="Timezone" value={profile?.timezone ?? "—"} />
          <Stat label="Locale" value={profile?.locale ?? "—"} />
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] px-3 py-3">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required)"
            className="w-full max-w-[520px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)]"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy != null}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface3)] disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => void post(`/api/operator/users/${encodeURIComponent(userId)}/reset-ai-usage`, "reset", {})}
            disabled={busy != null}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface3)] disabled:opacity-60"
          >
            {busy === "reset" ? "Resetting…" : "Reset AI usage"}
          </button>
          <button
            type="button"
            onClick={() =>
              void post(
                `/api/operator/users/${encodeURIComponent(userId)}/${isSuspended ? "unsuspend" : "suspend"}`,
                isSuspended ? "unsuspend" : "suspend",
                {}
              )
            }
            disabled={busy != null}
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/15 disabled:opacity-60"
          >
            {busy === "suspend" || busy === "unsuspend"
              ? "Working…"
              : isSuspended
                ? "Unsuspend"
                : "Suspend"}
          </button>
          <button
            type="button"
            onClick={() => void deleteUser()}
            disabled={busy != null}
            className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-60"
          >
            {busy === "delete" ? "Deleting…" : "Delete user"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-3 py-3">
            <div className="text-sm font-semibold text-[var(--text)]">Memberships</div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {memberships.length ? (
              memberships.map((m, idx) => (
                <div key={idx} className="px-3 py-3 text-sm text-[var(--text2)]">
                  <div className="text-[var(--text)]">{m.companies?.name ?? m.company_id}</div>
                  <div className="mt-1 text-xs text-[var(--text3)]">
                    {m.company_id} · role: {m.role}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-[var(--text2)]">—</div>
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-3 py-3">
            <div className="text-sm font-semibold text-[var(--text)]">Company subscriptions</div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {subs.length ? (
              subs.map((s, idx) => (
                <div key={idx} className="px-3 py-3 text-sm text-[var(--text2)]">
                  <div className="text-[var(--text)]">{s.company_id}</div>
                  <div className="mt-1 text-xs text-[var(--text3)]">
                    plan: {s.plan ?? "—"} · status: {s.status ?? "—"} · seats: {(s.seats_included ?? 0) + (s.seats_addon ?? 0)} ·
                    products: {(s.products_included ?? 0) + (s.products_addon ?? 0)}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-sm text-[var(--text2)]">—</div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-3 py-3">
          <div className="text-sm font-semibold text-[var(--text)]">Prospect research jobs</div>
          <div className="mt-1 text-xs text-[var(--text2)]">Most recent 50 jobs created by this user.</div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
              <tr>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text2)]">
              {jobs.map((j) => (
                <tr key={j.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 text-xs">{new Date(j.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--text)]">{j.status}</td>
                  <td className="px-3 py-2 text-xs">{new Date(j.updated_at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">{j.error ?? "—"}</td>
                </tr>
              ))}
              {!jobs.length ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-[var(--text2)]" colSpan={4}>
                    —
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border)] md:hidden">
          {jobs.map((j) => (
            <div key={j.id} className="px-3 py-3 text-sm text-[var(--text2)]">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-[11px] text-[var(--text)]">{j.status}</div>
                <div className="text-[11px] text-[var(--text3)]">{new Date(j.created_at).toLocaleString()}</div>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text3)]">Updated: {new Date(j.updated_at).toLocaleString()}</div>
              {j.error ? <div className="mt-2 text-xs text-red-200">{j.error}</div> : null}
            </div>
          ))}
          {!jobs.length ? <div className="px-3 py-3 text-sm text-[var(--text2)]">—</div> : null}
        </div>
      </div>
    </div>
  );
}

