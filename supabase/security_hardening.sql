-- ─── Security hardening migration ───────────────────────────────────────────
-- Applies:
--   1. Atomic AI quota increment RPC (prevents race-condition quota bypass)
--   2. Row Level Security on profiles table (prevents cross-user data reads)
--   3. profiles RLS policies (users can only read/update their own row)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Atomic quota increment: called by server-side API routes instead of
--    read-then-write, so concurrent requests cannot both read the same stale count.
CREATE OR REPLACE FUNCTION public.increment_ai_quota(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET ai_queries_used = COALESCE(ai_queries_used, 0) + 1
  WHERE id = p_user_id;
$$;

-- Allow any authenticated user to call this function (the SECURITY DEFINER
-- ensures the function runs with the owner's privileges, not the caller's).
GRANT EXECUTE ON FUNCTION public.increment_ai_quota(uuid) TO authenticated;

-- 2. Enable RLS on profiles.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Users may read only their own profile row.
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 4. Users may update only their own profile row.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Service role retains full access (used by server-side code).
--    Supabase service role bypasses RLS by default — no explicit policy needed.

-- 6. Platform admins need to read other profiles for the operator console.
--    The operator console uses the service role client, so this is already covered.
--    No additional policy required.
