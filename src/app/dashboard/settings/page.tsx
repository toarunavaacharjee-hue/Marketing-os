import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ManageBillingButton } from "@/app/dashboard/settings/ManageBillingButton";
import SettingsClient from "@/app/dashboard/settings/SettingsClient";

type Profile = {
  id: string;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number | null;
};

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,name,company,plan,ai_queries_used")
    .eq("id", user.id)
    .single();

  const p = (profile ?? null) as Profile | null;
  const plan = p?.plan ?? "free";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Settings
          </div>
          <div className="mt-2 text-sm text-[#9090b0]">
            Signed in as <span className="text-[#f0f0f8]">{user.email}</span>
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
    </div>
  );
}

