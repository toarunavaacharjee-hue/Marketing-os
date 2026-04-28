import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { GettingStartedClient } from "@/app/dashboard/getting-started/GettingStartedClient";

export default async function GettingStartedPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding-v2");
  return <GettingStartedClient environmentId={ctx.environmentId} />;
}

