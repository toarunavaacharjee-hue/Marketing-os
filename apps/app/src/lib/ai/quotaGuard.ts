import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanyPlanForSelectedCompany } from "@/lib/companyContext";
import { getEntitlements, isAiMonthlyQuotaExceeded } from "@/lib/planEntitlements";

type QuotaOk = { ok: true; userId: string; used: number };
type QuotaBlocked = { ok: false; response: NextResponse };
export type QuotaResult = QuotaOk | QuotaBlocked;

/**
 * Check AI quota for the current request user.
 * Returns ok=false with a ready-to-return NextResponse if unauthenticated or over limit.
 */
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

/**
 * Atomically increment ai_queries_used for the given user via a database-side RPC,
 * preventing race conditions when concurrent requests read and write the same counter.
 * See supabase/security_hardening.sql for the increment_ai_quota function definition.
 */
export async function incrementAiQuota(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.rpc("increment_ai_quota", { p_user_id: userId });
}
