import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { AllWorkClient } from "@/app/dashboard/work/AllWorkClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");
  return <AllWorkClient environmentId={ctx.environmentId} />;
}
