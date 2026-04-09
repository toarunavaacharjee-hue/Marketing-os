import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const { id } = await ctx.params;
  const userId = (id ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Missing user id." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "reason is required." }, { status: 400 });

  const { data: before } = await admin.from("profiles").select("ai_queries_used").eq("id", userId).maybeSingle();
  const { error } = await admin.from("profiles").update({ ai_queries_used: 0 }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: after } = await admin.from("profiles").select("ai_queries_used").eq("id", userId).maybeSingle();

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "user.ai_usage.reset",
    targetType: "user",
    targetId: userId,
    metadata: { reason },
    before,
    after
  });

  return NextResponse.json({ ok: true });
}

