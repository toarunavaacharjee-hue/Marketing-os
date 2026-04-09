import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const req = _req;
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const { id } = await ctx.params;
  const userId = (id ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Missing user id." }, { status: 400 });

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(userId);
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 });

  const { data: profile } = await admin
    .from("profiles")
    .select("id,name,company,plan,ai_queries_used,is_platform_admin,created_at")
    .eq("id", userId)
    .maybeSingle();

  const { data: memberships } = await admin
    .from("company_members")
    .select("company_id,role,companies(name)")
    .eq("user_id", userId);

  const companyIds = (memberships ?? []).map((m: any) => String(m.company_id)).filter(Boolean);
  const { data: subs } = companyIds.length
    ? await admin
        .from("company_subscriptions")
        .select("company_id,plan,status,seats_included,seats_addon,products_included,products_addon")
        .in("company_id", companyIds)
    : { data: [] as any[] };

  const { data: jobs } = await admin
    .from("prospect_research_jobs")
    .select("id,status,error,started_at,finished_at,updated_at,input_json,created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "operator.data.read",
    targetType: "user",
    targetId: userId,
    metadata: { kind: "user.detail" }
  });

  return NextResponse.json({
    ok: true,
    auth_user: authData.user ?? null,
    profile: profile ?? null,
    memberships: memberships ?? [],
    company_subscriptions: subs ?? [],
    prospect_research_jobs: jobs ?? []
  });
}

