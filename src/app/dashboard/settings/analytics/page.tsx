import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import AnalyticsSettingsClient from "@/app/dashboard/settings/analytics/AnalyticsSettingsClient";

export default async function AnalyticsSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-4xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
          Analytics settings
        </div>
        <div className="mt-2 text-sm text-[#9090b0]">
          Configure analytics connections for the selected product.
        </div>
      </div>
      <AnalyticsSettingsClient environmentId={ctx.environmentId} />
    </div>
  );
}

