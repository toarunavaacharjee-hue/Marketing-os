import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import LearningClient from "@/app/dashboard/settings/learning/LearningClient";

export default async function LearningSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-4xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
          Learning & health
        </div>
        <div className="mt-2 text-sm text-[#9090b0]">
          Track sync status, asset ingestion, and whether each module has enough signal to be useful.
        </div>
      </div>
      <LearningClient environmentId={ctx.environmentId} />
    </div>
  );
}

