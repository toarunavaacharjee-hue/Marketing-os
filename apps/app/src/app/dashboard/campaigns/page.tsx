import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CampaignPlanner } from "@/app/dashboard/campaigns/CampaignPlanner";

export default async function CampaignsPage() {
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
        Campaigns
      </h1>
      <p className="text-sm text-text2">
        Drag cards between columns to update status. Campaign narratives are saved per card. Data is saved per product.
      </p>
      <CampaignPlanner environmentId={ctx.environmentId} productName={productName} />
    </div>
  );
}
