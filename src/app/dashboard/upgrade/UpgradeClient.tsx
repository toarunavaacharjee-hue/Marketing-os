"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getEntitlements } from "@/lib/planEntitlements";

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

      const { data: prof } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();
      const plan = ((prof as any)?.plan ?? "starter") as string;
      const ent = getEntitlements(plan);

      const { data: memberships, error: memErr } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1);
      if (memErr) throw new Error(memErr.message);
      const companyId = (memberships?.[0] as any)?.company_id as string | undefined;
      if (!companyId) throw new Error("No company found for this user.");

      const priority =
        ent.supportTier === "priority" || ent.supportTier === "dedicated"
          ? "priority"
          : "normal";

      const subject = "Upgrade request";
      const body = `Please upgrade my account.\n\nContext:\n- Requested module: ${nextHref}\n- User: ${user.email ?? user.id}\n- Current plan: ${plan}\n- Requested: Growth (or Enterprise if needed)\n`;

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
    <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
      <div
        className="text-2xl text-[#f0f0f8]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Upgrade required
      </div>
      <div className="mt-2 text-sm text-[#9090b0]">
        Billing isn’t enabled yet. You can request an upgrade and the operator can change your plan from the Operator
        console.
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="mt-4 rounded-xl border border-[#b8ff6c]/30 bg-[#b8ff6c]/10 px-3 py-2 text-sm text-[#b8ff6c]">
          {ok}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/pricing"
          className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black"
        >
          View pricing
        </Link>
        <button
          type="button"
          onClick={() => void requestUpgrade()}
          disabled={busy}
          className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5 disabled:opacity-60"
        >
          {busy ? "Requesting…" : "Request upgrade"}
        </button>
        <Link
          href={nextHref}
          className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
        >
          Go back
        </Link>
        <Link
          href="/dashboard/support"
          className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
        >
          Support
        </Link>
      </div>
    </div>
  );
}

