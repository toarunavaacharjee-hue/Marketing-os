import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { processProspectResearchQueue } from "@/lib/prospectResearch/prospectResearchWorker";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ error: "reason is required." }, { status: 400 });

  const result = await processProspectResearchQueue();

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "prospect_research.worker.run",
    targetType: "prospect_research",
    targetId: "worker",
    metadata: { reason, result: result as any }
  });

  if (result.kind === "db_error") return NextResponse.json({ error: result.message }, { status: 500 });
  if (result.kind === "key_error") return NextResponse.json({ ok: false, error: result.error, processed: 0 });
  if (result.kind === "empty") return NextResponse.json({ ok: true, processed: 0 });
  return NextResponse.json({ ok: true, processed: result.processed });
}

