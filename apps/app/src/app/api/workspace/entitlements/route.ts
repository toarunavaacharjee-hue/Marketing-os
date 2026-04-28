import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCompanyPlan, getSelectedCompanyId } from "@/lib/companyContext";
import { getEntitlements } from "@/lib/planEntitlements";
import { listPriceForWorkspacePlan } from "@/lib/marketingPricing";

/**
 * Workspace-scoped plan + limits for the **selected** company (tenant cookie).
 * Used by dashboard clients so they do not read legacy `profiles.plan`.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const companyId = await getSelectedCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "No workspace selected." }, { status: 400 });
  }

  const { data: mem, error: memErr } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 500 });
  }
  if (!mem) {
    return NextResponse.json({ error: "Not a member of this workspace." }, { status: 403 });
  }

  const plan = await getCompanyPlan(companyId);
  const ent = getEntitlements(plan);
  const list = listPriceForWorkspacePlan(plan);

  return NextResponse.json({
    company_id: companyId,
    plan: ent.plan,
    seats_max: ent.seatsMax,
    products_max: ent.productsMax,
    ai_queries_per_month: ent.aiQueriesPerMonth,
    support_tier: ent.supportTier,
    list_price_monthly: list?.monthly ?? null,
    list_price_annual_effective_monthly: list?.annualMonthlyEquivalent ?? null
  });
}
