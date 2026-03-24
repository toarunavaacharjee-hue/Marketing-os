import { createClient } from "@supabase/supabase-js";
import { env, requireEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const serviceRoleKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false }
  });
}

