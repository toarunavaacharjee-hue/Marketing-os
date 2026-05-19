import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CreationWorkbench } from "@/app/dashboard/_components/CreationWorkbench";

export default async function DesignAssetsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <Suspense fallback={<div className="h-8 w-48 animate-pulse rounded-xl bg-surface3" />}>
      <CreationWorkbench
        environmentId={ctx.environmentId}
        moduleKey="design_assets"
        title="Design & Assets"
        description="Creative briefs, asset requests, and notes—plus AI-assisted brief generation."
        placeholder="e.g. Creative brief: product launch hero + 3 supporting illustrations; audience PLG teams"
        systemHint="You are a creative director. Output a structured brief: objective, audience, key message, mandatories, references."
      />
    </Suspense>
  );
}
