import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { AllWorkClient } from "@/app/dashboard/work/AllWorkClient";

export default async function AllWorkPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return <AllWorkClient environmentId={ctx.environmentId} />;
}
