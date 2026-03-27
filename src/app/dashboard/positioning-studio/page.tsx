import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import PositioningStudioClient from "@/app/dashboard/positioning-studio/PositioningStudioClient";

export default async function PositioningStudioPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return <PositioningStudioClient environmentId={ctx.environmentId} />;
}
