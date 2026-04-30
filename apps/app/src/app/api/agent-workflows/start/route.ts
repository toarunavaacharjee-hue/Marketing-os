import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { kind?: string; inputs?: Record<string, unknown> };

    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ ok: false, error: "No product context" }, { status: 400 });

    const kind = body.kind === "feature-launch" ? "feature-launch" : "product-launch";

    const { data: runRow, error: runErr } = await supabase
      .from("launch_playbook_runs")
      .insert({
        environment_id: ctx.environmentId,
        product_id: ctx.productId,
        created_by: user.id,
        kind,
        status: "completed",
        input_json: (body.inputs ?? {}) as any,
        output_json: {
          steps: [
            { id: "insights", status: "completed" },
            { id: "narrative", status: "completed" },
            { id: "gtm", status: "completed" },
            { id: "enablement", status: "completed" }
          ]
        },
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString()
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (runErr || !runRow?.id) {
      return NextResponse.json({ ok: false, error: runErr?.message ?? "Failed to create run" }, { status: 400 });
    }

    const artifacts = [
      {
        artifact_type: "positioning_guide",
        title: "Positioning Guide",
        status: "ready",
        content_json: { summary: "Generated from launch insights", model: "claude-sonnet", kind }
      },
      {
        artifact_type: "message_map",
        title: "Message Map",
        status: "ready",
        content_json: { summary: "Draft narrative + value props + proof", model: "claude-sonnet", kind }
      },
      {
        artifact_type: "launch_brief",
        title: "Launch Brief",
        status: "ready",
        content_json: { summary: "Launch plan + timeline + metrics", model: "claude-sonnet", kind }
      },
      {
        artifact_type: "sales_enablement",
        title: "Sales Enablement Pack",
        status: "ready",
        content_json: { summary: "Battlecard + scripts + deck outline", model: "claude-sonnet", kind }
      }
    ];

    const { error: artErr } = await supabase.from("artifact_library_items").insert(
      artifacts.map((a) => ({
        environment_id: ctx.environmentId,
        product_id: ctx.productId,
        created_by: user.id,
        source_run_id: runRow.id,
        ...a
      })) as any
    );

    if (artErr) {
      return NextResponse.json({ ok: false, error: artErr.message, runId: runRow.id }, { status: 400 });
    }

    return NextResponse.json({ ok: true, runId: runRow.id });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

