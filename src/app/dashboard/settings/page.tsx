import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ManageBillingButton } from "@/app/dashboard/settings/ManageBillingButton";
import SettingsClient from "@/app/dashboard/settings/SettingsClient";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number | null;
  is_platform_admin?: boolean | null;
};

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,name,company,plan,ai_queries_used,is_platform_admin")
    .eq("id", user.id)
    .single();

  const p = (profile ?? null) as Profile | null;
  const plan = p?.plan ?? "free";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#9090b0]">
            <Link href="/dashboard" className="text-[#7c6cff] hover:underline">
              ← Command Centre
            </Link>
            <span className="text-[#2a2e3f]">|</span>
            <span>
              Workspace setup for the <span className="text-[#f0f0f8]">selected product</span> in the header
              switcher
            </span>
          </div>
          <div className="mt-2 text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Settings
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#9090b0]">
            <span>
              Signed in as <span className="text-[#f0f0f8]">{user.email}</span>
            </span>
            {p?.is_platform_admin ? (
              <Link
                href="/operator"
                className="text-xs font-medium text-[#7c6cff] hover:text-[#a39cff] hover:underline"
              >
                Operator console
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#9090b0]">
            Plan: <span className="text-[#f0f0f8]">{plan}</span> • AI used:{" "}
            <span className="text-[#f0f0f8]">{p?.ai_queries_used ?? 0}</span>
          </div>
          <ManageBillingButton />
          <form action="/logout" method="post">
            <button className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#f0f0f8] hover:bg-white/5">
              Log out
            </button>
          </form>
        </div>
      </div>

      <SettingsClient
        initialName={p?.name ?? ""}
        initialCompany={p?.company ?? ""}
        email={user.email ?? ""}
      />

      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="text-sm text-[#f0f0f8]">Module settings</div>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <Link
            href="/dashboard/settings/team"
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] hover:bg-white/5"
          >
            Team & roles → members, permissions, governance
          </Link>
          <Link
            href="/dashboard/support"
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] hover:bg-white/5"
          >
            Support → submit tickets (tier-aware)
          </Link>
          <Link
            href="/dashboard/settings/product"
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] hover:bg-white/5"
          >
            Product profile → base product + competitors
          </Link>
          <Link
            href="/dashboard/settings/learning"
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] hover:bg-white/5"
          >
            Learning & health → sync status + coverage
          </Link>
          <Link
            href="/dashboard/settings/integrations"
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] hover:bg-white/5"
          >
            Integrations → GA4 / HubSpot / LinkedIn / Meta
          </Link>
          <Link
            href="/dashboard/settings/segments"
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] hover:bg-white/5"
          >
            Segments → configure ICP segments
          </Link>
          <Link
            href="/dashboard/settings/analytics"
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-3 text-sm text-[#f0f0f8] hover:bg-white/5"
          >
            Analytics → configure GA4/LinkedIn/Meta placeholders
          </Link>
        </div>
      </div>
    </div>
  );
}

