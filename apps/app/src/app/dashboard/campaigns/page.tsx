import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CampaignPlanner } from "@/app/dashboard/campaigns/CampaignPlanner";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

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
    <ModuleShell
      title="Campaigns"
      subtitle="Plan and track your marketing campaigns across channels."
    >
      <CampaignPlanner environmentId={ctx.environmentId} productName={productName} />
    </ModuleShell>
  );
}
