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

-- ─── module_settings RLS (H-3) ───────────────────────────────────────────────
-- module_settings stores per-environment configuration for every module,
-- including integration tokens (HubSpot, LinkedIn Ads, Meta Ads).
--
-- Policy design:
--   SELECT  — workspace members can read non-sensitive modules;
--             only admin/owner can read rows where module = 'integrations'
--             (tokens are additionally masked server-side before reaching the browser)
--   INSERT  — same scoping as SELECT
--   UPDATE  — same scoping as SELECT
--   DELETE  — admin/owner only for all modules
--
-- The join chain: module_settings.environment_id
--   → product_environments.id
--   → products.company_id
--   → company_members (user_id = auth.uid())
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "module_settings_select" ON public.module_settings;
CREATE POLICY "module_settings_select"
  ON public.module_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_environments pe
      JOIN public.products p ON p.id = pe.product_id
      JOIN public.company_members cm ON cm.company_id = p.company_id
      WHERE pe.id = module_settings.environment_id
        AND cm.user_id = auth.uid()
        AND (
          module_settings.module NOT IN ('integrations')
          OR cm.role IN ('owner', 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "module_settings_insert" ON public.module_settings;
CREATE POLICY "module_settings_insert"
  ON public.module_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.product_environments pe
      JOIN public.products p ON p.id = pe.product_id
      JOIN public.company_members cm ON cm.company_id = p.company_id
      WHERE pe.id = module_settings.environment_id
        AND cm.user_id = auth.uid()
        AND (
          module_settings.module NOT IN ('integrations')
          OR cm.role IN ('owner', 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "module_settings_update" ON public.module_settings;
CREATE POLICY "module_settings_update"
  ON public.module_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_environments pe
      JOIN public.products p ON p.id = pe.product_id
      JOIN public.company_members cm ON cm.company_id = p.company_id
      WHERE pe.id = module_settings.environment_id
        AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.product_environments pe
      JOIN public.products p ON p.id = pe.product_id
      JOIN public.company_members cm ON cm.company_id = p.company_id
      WHERE pe.id = module_settings.environment_id
        AND cm.user_id = auth.uid()
        AND (
          module_settings.module NOT IN ('integrations')
          OR cm.role IN ('owner', 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "module_settings_delete" ON public.module_settings;
CREATE POLICY "module_settings_delete"
  ON public.module_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_environments pe
      JOIN public.products p ON p.id = pe.product_id
      JOIN public.company_members cm ON cm.company_id = p.company_id
      WHERE pe.id = module_settings.environment_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    )
  );
