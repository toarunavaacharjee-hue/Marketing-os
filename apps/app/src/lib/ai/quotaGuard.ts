import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanyPlanForSelectedCompany, getSelectedCompanyId } from "@/lib/companyContext";
import { getEntitlements, isAiMonthlyQuotaExceeded } from "@/lib/planEntitlements";
import { logActivity } from "@/lib/analytics/logActivity";

type QuotaOk = { ok: true; userId: string; used: number };
type QuotaBlocked = { ok: false; response: NextResponse };
export type QuotaResult = QuotaOk | QuotaBlocked;

export async function checkAiQuota(): Promise<QuotaResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Not authenticated." }, { status: 401 })
    };
  }

  const profileSelect = await supabase
    .from("profiles")
    .select("ai_queries_used")
    .eq("id", user.id)
    .maybeSingle();

  const used =
    (profileSelect.data as { ai_queries_used?: number | null } | null)?.ai_queries_used ?? 0;
  const plan = (await getCompanyPlanForSelectedCompany()).toLowerCase();
  const ent = getEntitlements(plan);

  if (isAiMonthlyQuotaExceeded(ent, used)) {
    const cap = ent.aiQueriesPerMonth ?? 0;
    const companyId = await getSelectedCompanyId();
    logActivity({
      userId: user.id,
      companyId,
      event: "quota_exceeded",
      status: "quota_exceeded",
      metadata: { cap, used, plan }
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Plan limit reached (${cap} AI workflow runs/month). Upgrade to Growth or Enterprise for unlimited runs.`,
          code: "UPGRADE_REQUIRED"
        },
        { status: 402 }
      )
    };
  }

  return { ok: true, userId: user.id, used };
}

// Atomically increment the quota counter and log the AI query event.
// Pass the module slug so the operator analytics can break down AI usage per feature.
export async function incrementAiQuota(userId: string, module?: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.rpc("increment_ai_quota", { p_user_id: userId });
  const companyId = await getSelectedCompanyId();
  logActivity({ userId, companyId, event: "ai_query", module: module ?? null });
}
