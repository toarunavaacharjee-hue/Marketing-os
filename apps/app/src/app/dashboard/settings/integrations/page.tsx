import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import IntegrationsClient from "@/app/dashboard/settings/integrations/IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold text-heading" style={{ fontFamily: "var(--font-heading)" }}>
          Integrations
        </h1>
        <p className="mt-2 text-sm text-text2">
          Connect GA4, HubSpot, LinkedIn Ads, and Meta Ads. Tokens are stored securely
          per-workspace via Supabase RLS.
        </p>
      </div>
      <IntegrationsClient environmentId={ctx.environmentId} />
    </div>
  );
}

