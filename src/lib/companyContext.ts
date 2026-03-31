import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_COOKIE } from "@/lib/tenant";
import { normalizePlan, type Plan } from "@/lib/planEntitlements";

export async function getSelectedCompanyId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_COOKIE.companyId)?.value ?? null;
}

export async function getCompanyPlan(companyId: string): Promise<Plan> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("company_subscriptions")
    .select("plan")
    .eq("company_id", companyId)
    .maybeSingle();

  const planRaw = (data as any)?.plan ?? "starter";
  return normalizePlan(String(planRaw));
}

export async function getCompanyPlanForSelectedCompany(): Promise<Plan> {
  const companyId = await getSelectedCompanyId();
  if (!companyId) return "starter";
  return await getCompanyPlan(companyId);
}

