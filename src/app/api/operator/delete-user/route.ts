import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });
  }

  const body = (await req.json()) as { user_id?: string };
  const targetId = (body.user_id ?? "").trim();
  if (!targetId) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  }

  if (targetId === gate.userId) {
    return NextResponse.json({ error: "You cannot delete your own account from the operator console." }, { status: 400 });
  }

  const { data: targetProfile, error: profErr } = await admin
    .from("profiles")
    .select("id, is_platform_admin")
    .eq("id", targetId)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 400 });
  }

  if (targetProfile && Boolean((targetProfile as { is_platform_admin?: boolean }).is_platform_admin)) {
    return NextResponse.json(
      { error: "Remove platform admin access (is_platform_admin) before deleting this user." },
      { status: 400 }
    );
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
  if (delErr) {
    return NextResponse.json({ error: delErr.message ?? "Failed to delete user." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
