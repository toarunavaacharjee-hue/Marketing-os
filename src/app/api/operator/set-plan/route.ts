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
    return NextResponse.json(
      { error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." },
      { status: 500 }
    );
  }

  const body = (await req.json()) as { user_id?: string; plan?: string };
  const userId = (body.user_id ?? "").trim();
  const planRaw = (body.plan ?? "").trim().toLowerCase();
  const plan =
    planRaw === "starter" || planRaw === "growth" || planRaw === "enterprise"
      ? planRaw
      : null;

  if (!userId) return NextResponse.json({ error: "user_id is required." }, { status: 400 });
  if (!plan) return NextResponse.json({ error: "plan must be starter|growth|enterprise." }, { status: 400 });

  const { error } = await admin.from("profiles").update({ plan }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

