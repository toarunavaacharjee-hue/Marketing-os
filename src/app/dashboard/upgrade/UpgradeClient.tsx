"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getEntitlements } from "@/lib/planEntitlements";
import { publishedSelfServeMonthlyListSummary } from "@/lib/marketingPricing";

export default function UpgradeClient({ nextHref }: { nextHref: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestUpgrade() {
    setBusy(true);
    setOk(null);
    setError(null);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in.");

      const res = await fetch("/api/workspace/entitlements");
      const j = (await res.json()) as { error?: string; plan?: string; company_id?: string };
      if (!res.ok) throw new Error(j?.error ?? "Failed to load workspace plan.");
      const plan = String(j.plan ?? "starter");
      const companyId = j.company_id;
      if (!companyId) throw new Error("No workspace selected.");
      const ent = getEntitlements(plan);

      const priority =
        ent.supportTier === "priority" || ent.supportTier === "dedicated"
          ? "priority"
          : "normal";

      const subject = "Upgrade request";
      const body = `Please upgrade my account.\n\nContext:\n- Requested module: ${nextHref}\n- User: ${user.email ?? user.id}\n- Current plan: ${plan}\n- Requested: Growth (or Enterprise if needed)\n\n${publishedSelfServeMonthlyListSummary()}\n`;

      const { error: insErr } = await supabase.from("support_tickets").insert({
        company_id: companyId,
        created_by: user.id,
        subject,
        body,
        priority
      });
      if (insErr) throw new Error(insErr.message);

      setOk(priority === "priority" ? "Upgrade request submitted (priority)." : "Upgrade request submitted.");
      router.push("/dashboard/support");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to request upgrade.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6 shadow-card">
      <div className="text-2xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        Upgrade required
      </div>
      <div className="mt-2 text-sm text-text2">
        Billing isn’t enabled yet. You can request an upgrade and the operator can change your plan from the Operator
        console.
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">{error}</div>
      ) : null}
      {ok ? (
        <div className="mt-4 rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal">{ok}</div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/pricing"
          className="rounded-sm bg-amber px-4 py-2 text-sm font-semibold text-heading shadow-card hover:bg-amber-hover"
        >
          View pricing
        </Link>
        <button
          type="button"
          onClick={() => void requestUpgrade()}
          disabled={busy}
          className="rounded-sm border border-input-border bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface3 disabled:opacity-60"
        >
          {busy ? "Requesting…" : "Request upgrade"}
        </button>
        <Link
          href={nextHref}
          className="rounded-sm border border-input-border bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface3"
        >
          Go back
        </Link>
        <Link
          href="/dashboard/support"
          className="rounded-sm border border-input-border bg-surface2 px-4 py-2 text-sm font-medium text-text hover:bg-surface3"
        >
          Support
        </Link>
      </div>
    </div>
  );
}

