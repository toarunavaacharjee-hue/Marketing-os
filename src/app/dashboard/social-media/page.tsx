import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { CreationWorkbench } from "@/app/dashboard/_components/CreationWorkbench";

export default async function SocialMediaPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <CreationWorkbench
      environmentId={ctx.environmentId}
      moduleKey="social_media"
      title="Social Media"
      description="Queue posts, track publishing rhythm, and generate multi-format social copy."
      placeholder="e.g. LinkedIn thread: 5 hooks on pipeline attribution for RevOps leaders"
      systemHint="You are a B2B social lead. Output platform-ready copy (character-conscious). Prefer hooks + bullets for LinkedIn."
    />
  );
}
