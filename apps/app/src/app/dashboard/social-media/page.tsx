import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { SocialMediaClient } from "@/app/dashboard/social-media/SocialMediaClient";

export default async function SocialMediaPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-xl bg-surface3" />}>
      <SocialMediaClient environmentId={ctx.environmentId} />
    </Suspense>
  );
}
