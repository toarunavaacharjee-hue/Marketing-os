import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import LearningClient from "@/app/dashboard/settings/learning/LearningClient";

export const dynamic = "force-dynamic";

export default async function LearningSettingsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-3xl font-semibold text-text">
          Learning & health
        </div>
        <div className="mt-2 text-sm text-text2">
          Track sync status, asset ingestion, and whether each module has enough signal to be useful.
        </div>
      </div>
      <LearningClient environmentId={ctx.environmentId} />
    </div>
  );
}

