import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";

export async function POST(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    company_id?: string;
    reason?: string;
    confirm_name?: string;
  };
  const companyId = (body.company_id ?? "").trim();
  const reason = (body.reason ?? "").trim();
  const confirmName = (body.confirm_name ?? "").trim();
  if (!companyId) {
    return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }

  const { data: company, error: companyErr } = await admin
    .from("companies")
    .select("id,name")
    .eq("id", companyId)
    .maybeSingle();

  if (companyErr) {
    return NextResponse.json({ error: companyErr.message }, { status: 400 });
  }
  if (!company) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const expectedName = String((company as { name?: string | null }).name ?? "").trim();
  if (expectedName && confirmName !== expectedName) {
    return NextResponse.json(
      { error: "Confirmation name does not match workspace name." },
      { status: 400 }
    );
  }

  const { error: delErr } = await admin.from("companies").delete().eq("id", companyId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message ?? "Failed to delete workspace." }, { status: 400 });
  }

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "company.delete",
    targetType: "company",
    targetId: companyId,
    metadata: { reason },
    before: company,
    after: null
  });

  return NextResponse.json({ ok: true });
}
