import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { MessagingArtifactsClient } from "@/app/dashboard/messaging-artifacts/MessagingArtifactsClient";

export default async function MessagingArtifactsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/dashboard/onboarding");

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        Messaging &amp; Artifacts
      </h1>
      <p className="text-sm text-text2">
        Track messaging assets per segment. Generator uses your saved ICP segments.
      </p>
      <MessagingArtifactsClient environmentId={ctx.environmentId} />
    </div>
  );
}
