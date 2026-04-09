import type { SupabaseClient } from "@supabase/supabase-js";

export type OperatorAuditTargetType =
  | "user"
  | "company"
  | "company_subscription"
  | "prospect_research"
  | "system";

export type OperatorAuditAction =
  | "user.delete"
  | "user.suspend"
  | "user.unsuspend"
  | "user.ai_usage.reset"
  | "company.subscription.set"
  | "prospect_research.worker.run"
  | "operator.data.read";

function requestIp(req: Request): string | null {
  // Vercel/Proxies. Best-effort only.
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return null;
}

export async function writeOperatorAuditLog(args: {
  admin: SupabaseClient;
  req: Request;
  operatorUserId: string;
  action: OperatorAuditAction;
  targetType: OperatorAuditTargetType;
  targetId: string;
  metadata?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  const { admin, req, operatorUserId, action, targetType, targetId, metadata, before, after } = args;

  // Service role bypasses RLS. If the table is missing, we fail soft (operator actions should still work).
  try {
    await admin.from("operator_audit_log").insert({
      operator_user_id: operatorUserId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata_json: metadata ?? {},
      before_json: before ?? null,
      after_json: after ?? null,
      ip: requestIp(req),
      user_agent: req.headers.get("user-agent")
    });
  } catch {
    // swallow
  }
}

