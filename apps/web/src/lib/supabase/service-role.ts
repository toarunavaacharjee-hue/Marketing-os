import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service role client — bypasses RLS. Use only in server code after verifying
 * the current user is a platform operator (see getIsPlatformAdmin).
 */
export function createSupabaseServiceRoleClient() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
