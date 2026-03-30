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
      description="Plan and track pieces (type, channel, owners, links), then draft with AI using your product and segment context. Saved per product."
      placeholder="e.g. Thought leadership post on attribution myths for Series A SaaS CMOs"
      systemHint="You are a B2B content strategist. Produce ready-to-edit drafts (clear headings when helpful). Match the requested tone and length. Plain text only."
      contentStudio
    />
  );
}
