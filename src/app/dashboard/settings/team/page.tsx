import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_COOKIE } from "@/lib/tenant";
import TeamSettingsClient from "@/app/dashboard/settings/team/TeamSettingsClient";

type MemberRow = {
  company_id: string;
  user_id: string;
  role: string;
  profiles?: { name?: string | null; company?: string | null } | null;
};

export default async function TeamSettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const companyId = cookieStore.get(TENANT_COOKIE.companyId)?.value ?? null;
  if (!companyId) redirect("/dashboard/settings");

  const { data: myMembership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = ((myMembership as any)?.role ?? "member") as string;
  const canAdmin = myRole === "owner" || myRole === "admin";

  const { data: members } = await supabase
    .from("company_members")
    .select("company_id,user_id,role,profiles(name,company)")
    .eq("company_id", companyId)
    .order("role", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#9090b0]">
            <Link href="/dashboard/settings" className="text-[#7c6cff] hover:underline">
              ← Settings
            </Link>
            <span className="text-[#2a2e3f]">|</span>
            <span>Team governance</span>
          </div>
          <div className="mt-2 text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Team & roles
          </div>
          <div className="mt-2 text-sm text-[#9090b0]">
            Owners/admins can change roles and remove members. This is the foundation for approvals and governance.
          </div>
        </div>
        <div className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-sm text-[#9090b0]">
          Your role: <span className="text-[#f0f0f8]">{myRole}</span>
        </div>
      </div>

      <TeamSettingsClient
        companyId={companyId}
        canAdmin={canAdmin}
        initialMembers={((members ?? []) as MemberRow[]).map((m) => ({
          company_id: m.company_id,
          user_id: m.user_id,
          role: (m as any).role ?? "member",
          name: (m as any).profiles?.name ?? null
        }))}
      />
    </div>
  );
}

