import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { SalesIntelligenceClient } from "@/app/dashboard/sales-intelligence/SalesIntelligenceClient";

export default async function SalesIntelligencePage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-2xl bg-surface2" />}>
      <SalesIntelligenceClient environmentId={ctx.environmentId} />
    </Suspense>
  );
}
