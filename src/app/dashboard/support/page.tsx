"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getEntitlements } from "@/lib/planEntitlements";

type TicketRow = {
  id: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  created_at: string;
};

export default function SupportPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [plan, setPlan] = useState<string>("starter");
  const [workspaceCompanyId, setWorkspaceCompanyId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const ent = useMemo(() => getEntitlements(plan), [plan]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in.");

      const res = await fetch("/api/workspace/entitlements");
      const j = (await res.json()) as { error?: string; plan?: string; company_id?: string };
      if (!res.ok) throw new Error(j?.error ?? "Failed to load workspace plan.");
      const companyId = j.company_id;
      if (!companyId) throw new Error("No workspace selected.");
      setPlan(String(j.plan ?? "starter"));
      setWorkspaceCompanyId(companyId);

      const { data: t, error: tErr } = await supabase
        .from("support_tickets")
        .select("id,subject,body,status,priority,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (tErr) throw new Error(tErr.message);
      setTickets((t ?? []) as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load support.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitTicket() {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const s = subject.trim();
      const b = body.trim();
      if (!s || !b) throw new Error("Subject and description are required.");

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in.");

      const companyId = workspaceCompanyId;
      if (!companyId) throw new Error("Workspace not loaded yet. Refresh the page.");

      const priority = ent.supportTier === "priority" || ent.supportTier === "dedicated" ? "priority" : "normal";

      const { error: insErr } = await supabase.from("support_tickets").insert({
        company_id: companyId,
        created_by: user.id,
        subject: s,
        body: b,
        priority
      });
      if (insErr) throw new Error(insErr.message);

      setSubject("");
      setBody("");
      setOk(priority === "priority" ? "Submitted (priority)." : "Submitted.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit ticket.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-text2">
            Support tier:{" "}
            <span className="text-heading">
              {ent.supportTier === "dedicated" ? "Dedicated onboarding" : ent.supportTier === "priority" ? "Priority" : "Standard"}
            </span>
          </div>
          <div className="mt-2 text-4xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
            Support
          </div>
          <div className="mt-2 text-sm text-text2">
            Submit a ticket from inside the app. Growth/Enterprise tickets are tagged as priority.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pricing"
            className="rounded-lg border border-input-border bg-surface px-4 py-2 text-sm text-text shadow-card hover:bg-surface2"
          >
            Pricing
          </Link>
          <Link
            href="/dashboard/settings"
            className="rounded-lg border border-input-border bg-surface px-4 py-2 text-sm text-text shadow-card hover:bg-surface2"
          >
            Settings
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <div className="text-sm font-medium text-heading">New ticket</div>
        <div className="mt-3 grid gap-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g., 'Gating blocked Events module')"
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-primary focus:outline-none focus:shadow-focus"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened? Steps to reproduce, expected behavior, screenshots…"
            className="min-h-[120px] w-full rounded-sm border border-input-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-primary focus:outline-none focus:shadow-focus"
          />

          {error ? (
            <div className="rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">{error}</div>
          ) : null}
          {ok ? (
            <div className="rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal">{ok}</div>
          ) : null}

          <button
            type="button"
            onClick={() => void submitTicket()}
            disabled={saving || loading || !workspaceCompanyId}
            className="rounded-sm bg-[var(--btn-neutral-bg)] px-4 py-2 text-sm font-semibold text-on-dark hover:bg-[var(--btn-neutral-hover)] disabled:opacity-60"
          >
            {saving ? "Submitting..." : ent.supportTier === "priority" || ent.supportTier === "dedicated" ? "Submit (priority)" : "Submit"}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-heading">Recent tickets</div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-sm border border-input-border bg-surface2 px-3 py-2 text-xs text-text hover:bg-surface3"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-3 text-sm text-text3">Loading…</div>
        ) : tickets.length ? (
          <div className="mt-4 space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-surface2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-heading">{t.subject}</div>
                  <div className="text-xs text-text3">
                    {t.priority === "priority" ? "Priority" : "Standard"} • {t.status} •{" "}
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-text2">{t.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-text3">No tickets yet.</div>
        )}
      </div>
    </div>
  );
}

