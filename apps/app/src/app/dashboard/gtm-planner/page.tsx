import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GtmPlannerClient } from "@/app/dashboard/gtm-planner/GtmPlannerClient";

export default async function GTMPlannerPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  const supabase = createSupabaseServerClient();
  const { data: productRow } = await supabase
    .from("products")
    .select("name")
    .eq("id", ctx.productId)
    .maybeSingle();
  const productName = String((productRow as { name?: string } | null)?.name ?? "").trim();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        GTM Planner
      </h1>
      <p className="text-sm text-text2">
        Phase-by-phase launch checklist with owner tracking. AI generates a plan from your product,
        segment, and launch date.
      </p>
      <Suspense fallback={<div className="text-sm text-text2">Loading plan…</div>}>
        <GtmPlannerClient environmentId={ctx.environmentId} productName={productName} />
      </Suspense>
    </div>
  );
}
