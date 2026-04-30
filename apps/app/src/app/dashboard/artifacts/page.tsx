import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { ArtifactLibraryClient } from "@/app/dashboard/artifacts/ArtifactLibraryClient";

export default async function ArtifactLibraryPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return <ArtifactLibraryClient environmentId={ctx.environmentId} />;
}

