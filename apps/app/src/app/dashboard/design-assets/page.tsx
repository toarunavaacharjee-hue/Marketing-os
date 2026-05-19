import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { DesignAssetsClient } from "@/app/dashboard/design-assets/DesignAssetsClient";

export default async function DesignAssetsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-xl bg-surface3" />}>
      <DesignAssetsClient environmentId={ctx.environmentId} />
    </Suspense>
  );
}
