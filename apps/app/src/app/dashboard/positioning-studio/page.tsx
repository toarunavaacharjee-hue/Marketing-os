import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct, getSelectedProductId } from "@/lib/productContext";
import PositioningStudioClient from "@/app/dashboard/positioning-studio/PositioningStudioClient";

export default async function PositioningStudioPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  const productId = await getSelectedProductId();
  if (!productId) redirect("/onboarding-v2");

  return <PositioningStudioClient environmentId={ctx.environmentId} productId={productId} />;
}
