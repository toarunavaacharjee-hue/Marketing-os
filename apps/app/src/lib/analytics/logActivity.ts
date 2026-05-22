import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export type ActivityEvent =
  | "page_view"
  | "ai_query"
  | "ai_error"
  | "login"
  | "quota_exceeded"
  | "feature_error"
  | "document_upload"
  | "export"
  | "research_scan"
  | "prospect_research"
  | "segment_extract"
  | "battlecard_generate"
  | "positioning_generate"
  | "event_extract";

export type ActivityStatus = "ok" | "error" | "quota_exceeded";

export type LogActivityParams = {
  userId: string;
  companyId?: string | null;
  event: ActivityEvent;
  module?: string | null;
  status?: ActivityStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  durationMs?: number | null;
};

// Fire-and-forget: never throws, never awaited, never blocks a response.
export function logActivity(params: LogActivityParams): void {
  void (async () => {
    try {
      const admin = createSupabaseServiceRoleClient();
      await admin.from("activity_log").insert({
        user_id: params.userId,
        company_id: params.companyId ?? null,
        event: params.event,
        module: params.module ?? null,
        status: params.status ?? "ok",
        error_message: params.errorMessage ?? null,
        metadata: params.metadata ?? {},
        duration_ms: params.durationMs ?? null
      });
    } catch {
      // Analytics must never break the application
    }
  })();
}
