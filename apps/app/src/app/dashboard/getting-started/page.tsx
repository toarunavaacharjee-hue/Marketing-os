import { redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GettingStartedClient } from "@/app/dashboard/getting-started/GettingStartedClient";

export default async function GettingStartedPage() {
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  const supabase = createSupabaseServerClient();
  const { data: product } = await supabase
    .from("products")
    .select("name")
    .eq("id", ctx.productId)
    .maybeSingle();

  return (
    <GettingStartedClient
      environmentId={ctx.environmentId}
      productId={ctx.productId}
      productName={(product as { name?: string } | null)?.name ?? ""}
    />
  );
}
