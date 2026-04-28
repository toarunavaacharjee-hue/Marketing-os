import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type GenInput } from "@/lib/prospectResearch/generateProspectMemo";
import { PROSPECT_RESEARCH_STALE_RUNNING_MS } from "@/lib/prospectResearch/pollingConstants";

export const runtime = "nodejs";
export const maxDuration = 300;
/** Avoid static analysis during `next build` (uses `request.url` / search params). */
export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  created_by: string;
  status: "queued" | "running" | "completed" | "failed";
  input_json: GenInput;
  memo_json: unknown | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};

function isStaleRunning(job: JobRow): boolean {
  if (job.status !== "running") return false;
  const started = job.started_at ? Date.parse(job.started_at) : NaN;
  if (!Number.isFinite(started)) return true;
  // If the worker died mid-run, allow re-claim after a long window (generation can be several minutes).
  return Date.now() - started > PROSPECT_RESEARCH_STALE_RUNNING_MS;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId")?.trim();
    if (!jobId) return NextResponse.json({ error: "jobId is required." }, { status: 400 });

    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const { data: job, error: jobErr } = await supabase
      .from("prospect_research_jobs")
      .select(
        "id,created_by,status,input_json,memo_json,error,started_at,finished_at,updated_at"
      )
      .eq("id", jobId)
      .single<JobRow>();

    if (jobErr || !job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }
    if (job.created_by !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (job.status === "completed") {
      return NextResponse.json({ status: "completed", memo: job.memo_json });
    }
    if (job.status === "failed") {
      return NextResponse.json({ status: "failed", error: job.error ?? "AI request failed." });
    }

    // If "running" is stale, re-queue so a new poll can take ownership.
    if (isStaleRunning(job)) {
      await supabase
        .from("prospect_research_jobs")
        .update({
          status: "queued",
          error: null
        })
        .eq("id", jobId);
      return NextResponse.json({ status: "queued" });
    }

    // Background worker performs generation; status endpoint stays read-only to avoid long-running requests.
    return NextResponse.json({ status: job.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[prospects/research/status] uncaught:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
