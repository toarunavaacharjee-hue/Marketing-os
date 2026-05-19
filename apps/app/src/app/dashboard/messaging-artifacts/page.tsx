import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MessagingArtifactsClient } from "@/app/dashboard/messaging-artifacts/MessagingArtifactsClient";
import { SalesEnablementBriefBlock } from "@/app/dashboard/messaging-artifacts/SalesEnablementBriefBlock";

export default async function MessagingArtifactsPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  const supabase = createSupabaseServerClient();
  const { data: productRow } = await supabase
    .from("products")
    .select("name")
    .eq("id", ctx.productId)
    .maybeSingle();
  const productName = String((productRow as { name?: string } | null)?.name ?? "").trim();

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
        Messaging Pillars
      </h1>
      <p className="text-sm text-text2">
        Per-segment messaging pillars: headline, value props, proof point, and objection handling.
        Used as the foundation for all channel assets.
      </p>
      <MessagingArtifactsClient environmentId={ctx.environmentId} productName={productName} />
      <SalesEnablementBriefBlock environmentId={ctx.environmentId} />
    </div>
  );
}
