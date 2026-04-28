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

  const { data: company } = await supabase
    .from("companies")
    .select("id,name")
    .eq("id", companyId)
    .maybeSingle();

  const { data: myMembership } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  const myRole = ((myMembership as any)?.role ?? "member") as string;
  const canAdmin = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  // Migration/constraint tolerant: some deployments may not have an FK relationship for PostgREST joins.
  // If the `profiles` relationship isn't available, we fall back to a separate profiles query.
  let members: MemberRow[] = [];
  {
    const res = await supabase
      .from("company_members")
      .select("company_id,user_id,role,profiles(name,company)")
      .eq("company_id", companyId)
      .order("role", { ascending: true });

    if (!res.error && res.data) {
      members = res.data as MemberRow[];
    } else {
      const fallback = await supabase
        .from("company_members")
        .select("company_id,user_id,role")
        .eq("company_id", companyId)
        .order("role", { ascending: true });
      const rows = ((fallback.data ?? []) as Omit<MemberRow, "profiles">[]) as MemberRow[];
      const userIds = rows.map((r) => r.user_id);
      const { data: profileRows } = userIds.length
        ? await supabase.from("profiles").select("id,name,company").in("id", userIds)
        : { data: [] as any[] };
      const byId = new Map<string, { name?: string | null; company?: string | null }>();
      (profileRows ?? []).forEach((p: any) => byId.set(String(p.id), { name: p.name ?? null, company: p.company ?? null }));
      members = rows.map((r) => ({
        ...r,
        profiles: byId.get(String(r.user_id)) ?? null
      })) as MemberRow[];
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-text2">
            <Link href="/dashboard/settings" className="text-primary hover:underline">
              ← Settings
            </Link>
            <span className="text-text3">|</span>
            <span>Team governance</span>
          </div>
          <div className="mt-2 text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
            Team & roles
          </div>
          <div className="mt-2 text-sm text-text2">
            Owners/admins can change roles and remove members. This is the foundation for approvals and governance.
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text2">
          Your role: <span className="text-heading">{myRole}</span>
        </div>
      </div>

      <TeamSettingsClient
        companyId={companyId}
        canAdmin={canAdmin}
        isOwner={isOwner}
        initialCompanyName={String((company as any)?.name ?? "").trim()}
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

