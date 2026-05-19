import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CustomerInsightsClient } from "@/app/dashboard/customer-insights/CustomerInsightsClient";

export default async function CustomerInsightsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-2xl bg-surface2" />}>
      <CustomerInsightsClient environmentId={ctx.environmentId} />
    </Suspense>
  );
}
