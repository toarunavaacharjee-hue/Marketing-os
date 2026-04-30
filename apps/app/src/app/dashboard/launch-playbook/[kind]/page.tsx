import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { LaunchPlaybookDetailClient, type LaunchKind } from "@/app/dashboard/launch-playbook/LaunchPlaybookDetailClient";

export default async function LaunchPlaybookDetailPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  const safeKind: LaunchKind = kind === "feature-launch" ? "feature-launch" : "product-launch";
  return <LaunchPlaybookDetailClient environmentId={ctx.environmentId} kind={safeKind} />;
}

