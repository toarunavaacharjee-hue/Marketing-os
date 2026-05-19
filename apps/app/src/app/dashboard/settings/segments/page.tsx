import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import SegmentsClient from "@/app/dashboard/settings/segments/SegmentsClient";

export default async function SegmentsSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-3xl font-semibold text-text">
          Segments settings
        </div>
        <div className="mt-2 text-sm text-text2">
          Configure ICP segments for the selected product.
        </div>
      </div>
      <SegmentsClient environmentId={ctx.environmentId} />
    </div>
  );
}

