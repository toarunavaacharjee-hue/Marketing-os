import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import SegmentsClient from "@/app/dashboard/settings/segments/SegmentsClient";

export default async function SegmentsSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-4xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
          Segments settings
        </div>
        <div className="mt-2 text-sm text-[#9090b0]">
          Configure ICP segments for the selected product.
        </div>
      </div>
      <SegmentsClient environmentId={ctx.environmentId} />
    </div>
  );
}

