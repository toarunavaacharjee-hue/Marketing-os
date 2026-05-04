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
    const inputs = (body.inputs ?? {}) as Record<string, unknown>;
    const productName = typeof inputs.productName === "string" && inputs.productName.trim() ? inputs.productName.trim() : "your product";
    const audience = typeof inputs.audience === "string" && inputs.audience.trim() ? inputs.audience.trim() : "the target customer";
    const category = typeof inputs.category === "string" && inputs.category.trim() ? inputs.category.trim() : "your category";

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
        content_json: {
          model: "claude-sonnet",
          kind,
          summary: "Generated from launch insights",
          positioning_statement: `For ${audience}, ${productName} is a ${category} solution that helps teams achieve outcomes faster with less effort.`,
          differentiators: [
            "Faster time-to-value with guided workflows",
            "Reusable artifacts connected across modules",
            "AI-assisted generation with human-editable outputs"
          ],
          proof_points: ["Playbook runs logged to artifacts", "Versioned outputs per environment", "Shareable library view"],
          objections: [
            { objection: "We already have a process.", response: "This standardizes it and keeps artifacts connected to product context." },
            { objection: "Will AI be accurate?", response: "Outputs are drafts; you refine them, and the system keeps them organized and reusable." }
          ]
        }
      },
      {
        artifact_type: "message_map",
        title: "Message Map",
        status: "ready",
        content_json: {
          model: "claude-sonnet",
          kind,
          summary: "Draft narrative + value props + proof",
          core_message: `${productName} helps ${audience} get to a clear launch story and ship consistent messaging across channels.`,
          value_pillars: [
            {
              pillar: "Clarity",
              benefit: "Turn messy inputs into a crisp narrative.",
              proof: ["Positioning + messaging artifacts generated from one context", "Consistent story across teams"]
            },
            {
              pillar: "Speed",
              benefit: "Move from research to launch-ready copy quickly.",
              proof: ["Guided playbooks and module generators", "Reusable templates for briefs, maps, and enablement"]
            },
            {
              pillar: "Alignment",
              benefit: "Keep stakeholders on the same message.",
              proof: ["Central artifact library", "Run history and traceability per environment"]
            }
          ],
          proof_library: [
            "Customer quotes / testimonials",
            "Case study results / metrics",
            "Feature screenshots or demos",
            "Security/compliance notes (if relevant)"
          ],
          copy_blocks: {
            headlines: [
              `Launch with a story everyone can repeat.`,
              `From insights to messaging in one connected workspace.`,
              `Make your ${productName} launch clear, fast, and aligned.`
            ],
            subhead: `${productName} organizes your positioning, message map, and launch assets so teams ship a consistent narrative.`,
            short_pitch: `${productName} helps PMMs go from insights → positioning → message map → launch assets with reusable, connected artifacts.`,
            cta: "Generate a message map"
          },
          next_best_actions: [
            "Review and edit pillars + proof points",
            "Turn copy blocks into landing page and ad variants",
            "Create a sales enablement pack for the launch"
          ]
        }
      },
      {
        artifact_type: "launch_brief",
        title: "Launch Brief",
        status: "ready",
        content_json: {
          model: "claude-sonnet",
          kind,
          summary: "Launch plan + timeline + metrics",
          objective: `Launch ${productName} with a clear narrative and measurable outcomes.`,
          key_messages: ["Who it's for", "What problem it solves", "Why we're different", "Proof to believe"],
          timeline: [
            { phase: "Prep", weeks_out: 4, deliverables: ["Finalize message map", "Landing page draft", "Sales enablement outline"] },
            { phase: "Launch", weeks_out: 0, deliverables: ["Announcements", "Email + social", "Sales training"] },
            { phase: "Post-launch", weeks_out: 2, deliverables: ["Performance review", "Iterate messaging", "Case study plan"] }
          ],
          success_metrics: ["Pipeline influenced", "Landing page conversion", "Activation / usage lift", "Sales confidence score"]
        }
      },
      {
        artifact_type: "sales_enablement",
        title: "Sales Enablement Pack",
        status: "ready",
        content_json: {
          model: "claude-sonnet",
          kind,
          summary: "Battlecard + scripts + deck outline",
          talk_track: [
            `Problem: ${audience} struggles to keep launch messaging consistent.`,
            `Solution: ${productName} provides a connected workspace of reusable artifacts.`,
            "Outcome: clearer narrative, faster execution, aligned stakeholders."
          ],
          discovery_questions: [
            "How do you currently build and share messaging across teams?",
            "What slows down launches the most (research, alignment, copy, enablement)?",
            "Who signs off on positioning and what changes late in the process?"
          ],
          competitive_angles: ["Connected artifacts (not scattered docs)", "Workflow traceability (runs + environments)", "Copy-ready outputs"],
          deck_outline: ["Why now", "Problem", "Solution", "How it works", "Proof", "Next steps"]
        }
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

