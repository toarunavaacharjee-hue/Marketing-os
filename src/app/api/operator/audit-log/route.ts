import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = v ? Number.parseInt(v, 10) : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 100, 10, 500);

  const { data, error } = await admin
    .from("operator_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, entries: data ?? [] });
}

