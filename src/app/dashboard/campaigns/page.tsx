import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CampaignKanban } from "@/app/dashboard/campaigns/CampaignKanban";

export default async function CampaignsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
        Campaigns
      </h1>
      <p className="text-sm text-[#9090b0]">Drag cards between columns to update status. Data is saved per product.</p>
      <CampaignKanban environmentId={ctx.environmentId} />
    </div>
  );
}
