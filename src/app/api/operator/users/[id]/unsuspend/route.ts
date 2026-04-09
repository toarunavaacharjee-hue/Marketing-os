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

  const { data: before } = await admin.auth.admin.getUserById(userId);
  const { data, error } = await admin.auth.admin.updateUserById(userId, { ban_duration: "0h" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "user.unsuspend",
    targetType: "user",
    targetId: userId,
    metadata: { reason },
    before: before?.user ?? null,
    after: data?.user ?? null
  });

  return NextResponse.json({ ok: true });
}

