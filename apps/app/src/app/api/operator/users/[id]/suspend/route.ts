import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";

const DEFAULT_BAN_DURATION = "87600h"; // ~10 years (effectively indefinite)

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const { id } = await ctx.params;
  const userId = (id ?? "").trim();
  if (!userId) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (userId === gate.userId) {
    return NextResponse.json({ error: "You cannot suspend your own operator account." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string; duration?: string };
  const reason = (body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "reason is required." }, { status: 400 });

  const banDuration = (body.duration ?? DEFAULT_BAN_DURATION).trim() || DEFAULT_BAN_DURATION;

  const { data: before } = await admin.auth.admin.getUserById(userId);
  const { data, error } = await admin.auth.admin.updateUserById(userId, { ban_duration: banDuration });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "user.suspend",
    targetType: "user",
    targetId: userId,
    metadata: { reason, ban_duration: banDuration },
    before: before?.user ?? null,
    after: data?.user ?? null
  });

  return NextResponse.json({ ok: true });
}

