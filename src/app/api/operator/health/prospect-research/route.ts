import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const [queuedRes, runningRes, failedRes] = await Promise.all([
    admin.from("prospect_research_jobs").select("id", { count: "exact", head: true }).eq("status", "queued"),
    admin.from("prospect_research_jobs").select("id", { count: "exact", head: true }).eq("status", "running"),
    admin.from("prospect_research_jobs").select("id", { count: "exact", head: true }).eq("status", "failed")
  ]);

  const { data: oldestQueued } = await admin
    .from("prospect_research_jobs")
    .select("created_at")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  const now = Date.now();
  const oldestQueuedAgeMs = oldestQueued?.created_at ? now - new Date(oldestQueued.created_at).getTime() : null;

  const health = {
    queued: queuedRes.error ? null : queuedRes.count ?? 0,
    running: runningRes.error ? null : runningRes.count ?? 0,
    failed: failedRes.error ? null : failedRes.count ?? 0,
    oldestQueuedCreatedAt: oldestQueued?.created_at ?? null,
    oldestQueuedAgeMs
  };

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "operator.data.read",
    targetType: "prospect_research",
    targetId: "health",
    metadata: health as any
  });

  return NextResponse.json({ ok: true, health });
}

