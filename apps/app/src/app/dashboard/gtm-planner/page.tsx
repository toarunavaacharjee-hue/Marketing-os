import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { GtmPlannerClient } from "@/app/dashboard/gtm-planner/GtmPlannerClient";

export default async function GTMPlannerPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        GTM Planner
      </h1>
      <GtmPlannerClient environmentId={ctx.environmentId} />
    </div>
  );
}
