-- ─── Activity log — product analytics ────────────────────────────────────────
-- Captures every meaningful user interaction: page views, AI queries, errors.
-- Written server-side only (service role or server client). The operator console
-- reads this table via the service role client; RLS blocks cross-user reads for
-- authenticated users if they ever query directly.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.activity_log (
  id            bigserial    PRIMARY KEY,
  user_id       uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id    uuid         REFERENCES public.companies(id) ON DELETE SET NULL,
  event         text         NOT NULL,  -- 'page_view' | 'ai_query' | 'login' | 'feature_error' | etc.
  module        text,                   -- dashboard module slug, e.g. 'market-research'
  status        text         NOT NULL DEFAULT 'ok',  -- 'ok' | 'error' | 'quota_exceeded'
  error_message text,
  metadata      jsonb        NOT NULL DEFAULT '{}',
  duration_ms   integer,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

-- Indexes optimised for the operator analytics queries
CREATE INDEX IF NOT EXISTS activity_log_user_created
  ON public.activity_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_created
  ON public.activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS activity_log_module_created
  ON public.activity_log (module, created_at DESC)
  WHERE module IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_log_errors
  ON public.activity_log (created_at DESC)
  WHERE status = 'error';

-- RLS: authenticated users may only see their own rows.
-- Operator console uses service role which bypasses RLS entirely.
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_select_own" ON public.activity_log;
CREATE POLICY "activity_log_select_own"
  ON public.activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_log_insert_own" ON public.activity_log;
CREATE POLICY "activity_log_insert_own"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
