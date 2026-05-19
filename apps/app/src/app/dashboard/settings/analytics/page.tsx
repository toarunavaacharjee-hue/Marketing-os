import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import AnalyticsSettingsClient from "@/app/dashboard/settings/analytics/AnalyticsSettingsClient";

export default async function AnalyticsSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-3xl font-semibold text-text">
          Analytics settings
        </div>
        <div className="mt-2 text-sm text-text2">
          Configure analytics connections for the selected product.
        </div>
      </div>
      <AnalyticsSettingsClient environmentId={ctx.environmentId} />
    </div>
  );
}

