import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CreationWorkbench } from "@/app/dashboard/_components/CreationWorkbench";

export default async function PresentationsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <CreationWorkbench
      environmentId={ctx.environmentId}
      moduleKey="presentations"
      title="Presentations"
      description="Outline decks, track deadlines, and generate slide narratives or talk tracks."
      placeholder="e.g. 12-slide board update: GTM efficiency, pipeline, next 2 quarters"
      systemHint="You are a GTM storyteller. Output slide-by-slide outline with title + 2–3 bullets each."
    />
  );
}
