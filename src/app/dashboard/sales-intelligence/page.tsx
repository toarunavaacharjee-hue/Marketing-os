import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { InsightWorkbench } from "@/app/dashboard/_components/InsightWorkbench";

export default async function SalesIntelligencePage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <InsightWorkbench environmentId={ctx.environmentId} variant="sales" title="Sales Intelligence" />
  );
}
