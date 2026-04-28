import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function getSelectedProductId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_COOKIE.productId)?.value ?? null;
}

export async function ensureDefaultEnvironmentIdForSelectedProduct(): Promise<{
  productId: string;
  environmentId: string;
}> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const productId = await getSelectedProductId();
  if (!productId) throw new Error("No product selected.");

  const { data: envRow } = await supabase
    .from("product_environments")
    .select("id,product_id")
    .eq("product_id", productId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (envRow?.id) {
    return { productId, environmentId: envRow.id as string };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("product_members")
    .select("role")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .maybeSingle<{ role: string }>();

  const role = String(membership?.role ?? "").toLowerCase();
  const canCreateEnvironment = !membershipError && (role === "owner" || role === "admin");
  if (!canCreateEnvironment) {
    throw new Error("You don't have permission to create environments for this product.");
  }

  const { data: createdEnv, error: createError } = await supabase
    .from("product_environments")
    .insert({
      product_id: productId,
      name: "Default"
    })
    .select("id")
    .maybeSingle<{ id: string }>();

  if (createError) {
    throw new Error(
      createError.message ||
        "Could not create product environment. If this is an RLS error, apply supabase/product_environments_policies.sql."
    );
  }
  if (!createdEnv?.id) {
    throw new Error("Could not create product environment.");
  }

  return { productId, environmentId: createdEnv.id };
}

export async function getDefaultEnvironmentIdForSelectedProduct(): Promise<{
  productId: string;
  environmentId: string;
} | null> {
  try {
    return await ensureDefaultEnvironmentIdForSelectedProduct();
  } catch {
    return null;
  }
}