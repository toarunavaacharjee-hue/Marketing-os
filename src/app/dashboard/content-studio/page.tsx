import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CreationWorkbench } from "@/app/dashboard/_components/CreationWorkbench";

export default async function ContentStudioPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <CreationWorkbench
      environmentId={ctx.environmentId}
      moduleKey="content_studio"
      title="Content Studio"
      description="Plan content in a queue, capture calendar milestones, and generate drafts with AI. Saved per product."
      placeholder="e.g. Thought leadership post on attribution myths for Series A SaaS CMOs"
      systemHint="You are a B2B content strategist. Produce ready-to-edit drafts (headings optional). Keep paragraphs tight."
    />
  );
}
