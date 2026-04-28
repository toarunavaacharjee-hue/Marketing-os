import { createSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import {
  generateProspectMemo,
  retryProspectMemoStrict,
  type GenInput
} from "@/lib/prospectResearch/generateProspectMemo";
import { normalizeProspectMemo, type ProspectIntelligenceMemo } from "@/lib/prospectIntelligenceTypes";

type JobRow = {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  input_json: GenInput;
};

function isMemoComplete(memo: ProspectIntelligenceMemo): boolean {
  const keys: Array<keyof ProspectIntelligenceMemo> = [
    "executive_summary",
    "what_theyre_looking_for",
    "key_decision_makers",
    "organizational_context",
    "sales_strategy_notes",
    "open_intelligence_gaps",
    "meeting_demo_prep",
    "research_sources"
  ];
  return keys.every((k) => typeof memo[k] === "string" && memo[k].trim().length > 0);
}

export type ProcessProspectResearchQueueResult =
  | { kind: "db_error"; message: string }
  | { kind: "empty" }
  | { kind: "key_error"; error: string }
  | { kind: "done"; processed: number };

/**
 * Claims up to two queued prospect research jobs and runs generation.
 * Used by the cron route and (via waitUntil) right after enqueue on /api/prospects/research/run.
 */
export async function processProspectResearchQueue(): Promise<ProcessProspectResearchQueueResult> {
  const supabase = createSupabaseAdminClient();

  const { data: queued, error: qErr } = await supabase
    .from("prospect_research_jobs")
    .select("id,status,input_json")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(2)
    .returns<JobRow[]>();

  if (qErr) return { kind: "db_error", message: qErr.message };
  if (!queued?.length) return { kind: "empty" };

  const keyRes = await resolveWorkspaceAnthropicKey();
  if (!keyRes.ok) {
    await Promise.all(
      queued.map((j) =>
        supabase
          .from("prospect_research_jobs")
          .update({
            status: "failed",
            error: keyRes.error,
            finished_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", j.id)
      )
    );
    return { kind: "key_error", error: keyRes.error };
  }

  let processed = 0;

  for (const job of queued) {
    const { data: claimed, error: claimErr } = await supabase
      .from("prospect_research_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error: null
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id,input_json")
      .maybeSingle<{ id: string; input_json: GenInput }>();

    if (claimErr || !claimed?.id) continue;

    let gen = await generateProspectMemo(keyRes.key, claimed.input_json);
    if (gen.ok) {
      const memo = normalizeProspectMemo(gen.memo);
      if (!isMemoComplete(memo)) {
        const repaired = await retryProspectMemoStrict(keyRes.key, claimed.input_json);
        if (repaired.ok) gen = repaired;
      }
    } else {
      const isLikelyFormatIssue = gen.error.toLowerCase().includes("invalid json");
      if (isLikelyFormatIssue) {
        const retry = await retryProspectMemoStrict(keyRes.key, claimed.input_json);
        if (retry.ok) gen = retry;
      }
    }

    if (!gen.ok) {
      await supabase
        .from("prospect_research_jobs")
        .update({
          status: "failed",
          error: gen.error,
          finished_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", claimed.id);
      processed++;
      continue;
    }

    const memo = normalizeProspectMemo(gen.memo);
    await supabase
      .from("prospect_research_jobs")
      .update({
        status: "completed",
        memo_json: memo,
        error: null,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", claimed.id);
    processed++;
  }

  return { kind: "done", processed };
}
