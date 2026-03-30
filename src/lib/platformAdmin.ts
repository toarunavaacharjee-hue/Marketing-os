import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OperatorGate =
  | { ok: true; userId: string }
  | { ok: false; redirect: "login" | "dashboard" };

/**
 * Single auth + profile check for /operator. Uses anon session + RLS (own profile only).
 */
export async function getOperatorGate(): Promise<OperatorGate> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, redirect: "login" };
  const { data, error } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return { ok: false, redirect: "dashboard" };
  const isAdmin = Boolean((data as { is_platform_admin?: boolean }).is_platform_admin);
  if (!isAdmin) return { ok: false, redirect: "dashboard" };
  return { ok: true, userId: user.id };
}
