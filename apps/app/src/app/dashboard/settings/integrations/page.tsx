import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import IntegrationsClient from "@/app/dashboard/settings/integrations/IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-4xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
          Integrations settings
        </div>
        <div className="mt-2 text-sm text-text2">
          Configure GA4, HubSpot, LinkedIn Ads, and Meta Ads for this product.
        </div>
      </div>
      <IntegrationsClient environmentId={ctx.environmentId} />
    </div>
  );
}

