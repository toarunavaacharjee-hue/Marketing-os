import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const { runId } = await params;
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const { data: run, error: runErr } = await supabase
      .from("launch_playbook_runs")
      .select("id,status,kind,input_json,error,created_at,finished_at")
      .eq("id", runId)
      .maybeSingle();

    if (runErr || !run) {
      return NextResponse.json({ ok: false, error: "Run not found" }, { status: 404 });
    }

    const { data: artifacts } = await supabase
      .from("artifact_library_items")
      .select("id,artifact_type,title,status")
      .eq("source_run_id", runId)
      .order("created_at", { ascending: true });

    const r = run as any;
    return NextResponse.json({
      ok: true,
      status: r.status,
      kind: r.kind,
      launchName: r.input_json?.launchName ?? null,
      artifacts: artifacts ?? [],
      error: r.error ?? null
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
