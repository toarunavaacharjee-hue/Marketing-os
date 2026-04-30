import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { LaunchPlaybookClient } from "@/app/dashboard/launch-playbook/LaunchPlaybookClient";

export default async function LaunchPlaybookIndexPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return <LaunchPlaybookClient environmentId={ctx.environmentId} />;
}

