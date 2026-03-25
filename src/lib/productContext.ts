import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function getSelectedProductId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_COOKIE.productId)?.value ?? null;
}

export async function getDefaultEnvironmentIdForSelectedProduct(): Promise<{
  productId: string;
  environmentId: string;
} | null> {
  const supabase = createSupabaseServerClient();
  const productId = await getSelectedProductId();
  if (!productId) return null;

  const { data: envRow } = await supabase
    .from("product_environments")
    .select("id,product_id")
    .eq("product_id", productId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!envRow?.id) return null;
  return { productId, environmentId: envRow.id as string };
}

