import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { LaunchPlaybookClient } from "@/app/dashboard/launch-playbook/LaunchPlaybookClient";

export default async function LaunchPlaybookIndexPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  return <LaunchPlaybookClient environmentId={ctx.environmentId} />;
}

