import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { PresentationsClient } from "@/app/dashboard/presentations/PresentationsClient";

export default async function PresentationsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-xl bg-surface3" />}>
      <PresentationsClient environmentId={ctx.environmentId} />
    </Suspense>
  );
}
