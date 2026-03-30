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

      const { data: prof } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();
      setPlan(((prof as any)?.plan ?? "starter") as string);

      const { data: memberships, error: memErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1);
      if (memErr) throw new Error(memErr.message);
      const companyId = (memberships?.[0] as any)?.company_id as string | undefined;
      if (!companyId) throw new Error("No company found for this user.");

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

      const { data: memberships, error: memErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1);
      if (memErr) throw new Error(memErr.message);
      const companyId = (memberships?.[0] as any)?.company_id as string | undefined;
      if (!companyId) throw new Error("No company found for this user.");

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
          <div className="text-sm text-[#9090b0]">
            Support tier:{" "}
            <span className="text-[#f0f0f8]">
              {ent.supportTier === "dedicated" ? "Dedicated onboarding" : ent.supportTier === "priority" ? "Priority" : "Standard"}
            </span>
          </div>
          <div className="mt-2 text-4xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
            Support
          </div>
          <div className="mt-2 text-sm text-[#9090b0]">
            Submit a ticket from inside the app. Growth/Enterprise tickets are tagged as priority.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pricing" className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-2 text-sm text-[#f0f0f8] hover:bg-white/5">
            Pricing
          </Link>
          <Link href="/dashboard/settings" className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-2 text-sm text-[#f0f0f8] hover:bg-white/5">
            Settings
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="text-sm text-[#f0f0f8]">New ticket</div>
        <div className="mt-3 grid gap-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (e.g., 'Gating blocked Events module')"
            className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#9090b0]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What happened? Steps to reproduce, expected behavior, screenshots…"
            className="min-h-[120px] w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#9090b0]"
          />

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
          ) : null}
          {ok ? (
            <div className="rounded-xl border border-[#b8ff6c]/30 bg-[#b8ff6c]/10 px-3 py-2 text-sm text-[#b8ff6c]">{ok}</div>
          ) : null}

          <button
            type="button"
            onClick={() => void submitTicket()}
            disabled={saving}
            className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
          >
            {saving ? "Submitting..." : ent.supportTier === "priority" || ent.supportTier === "dedicated" ? "Submit (priority)" : "Submit"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[#f0f0f8]">Recent tickets</div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-xs text-[#f0f0f8] hover:bg-white/5"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-3 text-sm text-[#9090b0]">Loading…</div>
        ) : tickets.length ? (
          <div className="mt-4 space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-[#2a2e3f] bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-[#f0f0f8]">{t.subject}</div>
                  <div className="text-xs text-[#9090b0]">
                    {t.priority === "priority" ? "Priority" : "Standard"} • {t.status} •{" "}
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-[#9090b0]">{t.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-[#9090b0]">No tickets yet.</div>
        )}
      </div>
    </div>
  );
}

