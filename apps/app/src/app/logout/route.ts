import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_COOKIE } from "@/lib/tenant";

async function signOutAndRedirect() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();

  // Clear workspace/product context so a fresh login starts cleanly.
  const store = await cookies();
  store.set(TENANT_COOKIE.companyId, "", { path: "/", expires: new Date(0) });
  store.set(TENANT_COOKIE.productId, "", { path: "/", expires: new Date(0) });

  redirect("/login");
}

export async function GET() {
  return signOutAndRedirect();
}

export async function POST() {
  return signOutAndRedirect();
}

