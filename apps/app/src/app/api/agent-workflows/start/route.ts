import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getDefaultEnvironmentIdForSelectedProduct,
  getSelectedProductId
} from "@/lib/productContext";
import { getCompanyPlanForSelectedCompany, getSelectedCompanyId } from "@/lib/companyContext";
import { getEntitlements, isAiMonthlyQuotaExceeded } from "@/lib/planEntitlements";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { logActivity } from "@/lib/analytics/logActivity";

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

async function callClaude(key: string, system: string, userPrompt: string, maxTokens = 2048): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  const data = (await res.json()) as AnthropicResponse;
  if (!res.ok) throw new Error(data?.error?.message ?? "Anthropic request failed");
  return data.content?.find((c) => c.type === "text")?.text ?? "";
}

function safeParseJson(text: string, fallback: unknown): unknown {
  try {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const raw = fenceMatch ? fenceMatch[1] : text;
    const jsonMatch = raw.match(/(\{[\s\S]*\})/);
    return JSON.parse(jsonMatch ? jsonMatch[1] : raw.trim());
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      kind?: string;
      inputs?: {
        launchName?: string;
        launchDescription?: string;
        launchDate?: string;
        tier?: string;
        segmentId?: string;
        competitiveContext?: string;
        messageConstraints?: string;
      };
    };

    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ ok: false, error: "No product context" }, { status: 400 });

    // AI quota check
    const { data: profileData } = await supabase
      .from("profiles")
      .select("ai_queries_used")
      .eq("id", user.id)
      .maybeSingle();
    const plan = (await getCompanyPlanForSelectedCompany()).toLowerCase();
    const used = (profileData as { ai_queries_used?: number } | null)?.ai_queries_used ?? 0;
    const ent = getEntitlements(plan);
    if (isAiMonthlyQuotaExceeded(ent, used)) {
      return NextResponse.json(
        { ok: false, error: "Plan limit reached. Upgrade for unlimited AI workflow runs.", code: "UPGRADE_REQUIRED" },
        { status: 402 }
      );
    }

    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) return NextResponse.json({ ok: false, error: keyRes.error }, { status: keyRes.status });
    const anthropicKey = keyRes.key;

    const kind = body.kind === "feature-launch" ? "feature-launch" : "product-launch";
    const inputs = body.inputs ?? {};
    const launchName = inputs.launchName?.trim() || (kind === "feature-launch" ? "Feature Launch" : "Product Launch");
    const launchDescription = inputs.launchDescription?.trim() || "";
    const launchDate = inputs.launchDate?.trim() || "";
    const tier = inputs.tier?.trim() || "Tier 2";
    const segmentId = inputs.segmentId?.trim() || "";
    const competitiveContext = inputs.competitiveContext?.trim() || "";
    const messageConstraints = inputs.messageConstraints?.trim() || "";

    // Read product context
    const productId = await getSelectedProductId();
    const { data: product } = await supabase
      .from("products")
      .select("name,category,icp_summary,positioning_summary")
      .eq("id", productId ?? ctx.productId)
      .maybeSingle();
    const productName = (product as any)?.name ?? "your product";
    const productCategory = (product as any)?.category ?? "";

    // Read ICP segments
    const { data: segments } = await supabase
      .from("segments")
      .select("id,name,pnf_score,pain_points,details")
      .eq("environment_id", ctx.environmentId)
      .order("pnf_score", { ascending: false })
      .limit(10);
    const allSegments = (segments ?? []) as Array<{
      id: string;
      name: string;
      pnf_score: number;
      pain_points: string[];
      details: any;
    }>;
    const primarySegment = segmentId
      ? allSegments.find((s) => s.id === segmentId)
      : allSegments[0];

    // Read positioning canvas
    const { data: canvasRow } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", "positioning_studio")
      .eq("key", "canvas")
      .maybeSingle();
    const canvas = (canvasRow?.value_json as any)?.doc ?? {};

    // Read latest completed market research scan
    const { data: latestScan } = await supabase
      .from("research_scans")
      .select("result_json")
      .eq("environment_id", ctx.environmentId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const scanResult = (latestScan?.result_json as any) ?? {};
    const marketSignals = (Array.isArray(scanResult.signals) ? scanResult.signals : [])
      .slice(0, 5)
      .map((s: any) => `• ${s.title}: ${s.description}`)
      .join("\n");

    // Build shared context block passed to every Claude call
    const sharedContext = [
      `Product: ${productName}`,
      `Category: ${productCategory || canvas.category || "not specified"}`,
      `Launch name: ${launchName}`,
      `Launch type: ${kind === "feature-launch" ? "Feature Launch" : "Product Launch"}`,
      `What we are launching: ${launchDescription || "not specified"}`,
      `Target launch date: ${launchDate || "TBD"}`,
      `Launch tier: ${tier}`,
      "",
      `Primary target segment: ${primarySegment?.name ?? "not specified"}`,
      `Segment pain points: ${(primarySegment?.pain_points ?? []).join("; ") || "not specified"}`,
      `ICP profile: ${primarySegment?.details?.icp_profile ?? ""}`,
      "",
      `All segments: ${allSegments.map((s) => `${s.name} (PNF: ${s.pnf_score})`).join(", ") || "none defined"}`,
      "",
      "Positioning canvas:",
      `  Category: ${canvas.category || "not set"}`,
      `  Target customer: ${canvas.target || "not set"}`,
      `  Problem we solve: ${canvas.problem || "not set"}`,
      `  Our solution: ${canvas.solution || "not set"}`,
      `  Differentiation: ${canvas.diff || "not set"}`,
      `  Strategic wedge: ${canvas.wedge || "not set"}`,
      marketSignals ? `\nMarket signals:\n${marketSignals}` : "",
      competitiveContext ? `\nCompetitive context: ${competitiveContext}` : "",
      messageConstraints ? `\nMessage constraints: ${messageConstraints}` : ""
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt =
      "You are a senior B2B product marketing strategist. Return ONLY a valid JSON object — no explanation, no markdown fences, no code blocks. Just the raw JSON.";

    // Create run record with status=running
    const { data: runRow, error: runErr } = await supabase
      .from("launch_playbook_runs")
      .insert({
        environment_id: ctx.environmentId,
        product_id: ctx.productId,
        created_by: user.id,
        kind,
        status: "running",
        input_json: { launchName, launchDescription, launchDate, tier, segmentId, competitiveContext, messageConstraints },
        started_at: new Date().toISOString()
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (runErr || !runRow?.id) {
      return NextResponse.json({ ok: false, error: runErr?.message ?? "Failed to create run" }, { status: 400 });
    }
    const runId = runRow.id;

    // ── Step 1: Positioning Guide ─────────────────────────────────────────────
    const pgText = await callClaude(
      anthropicKey,
      systemPrompt,
      `${sharedContext}

Generate a positioning guide for this launch. Return this exact JSON:
{
  "summary": "2-3 sentence summary of this launch positioning",
  "positioning_statement": "For [target customer], [product] is a [category] that [key benefit], unlike [current alternative]",
  "differentiators": ["most important differentiator for this launch", "second differentiator", "third differentiator"],
  "proof_points": ["specific, believable proof point 1", "proof point 2", "proof point 3"],
  "objections": [
    { "objection": "most common objection reps hear", "response": "honest, specific response with proof" },
    { "objection": "second common objection", "response": "response" },
    { "objection": "third objection", "response": "response" }
  ]
}`
    );
    const pgJson = safeParseJson(pgText, {
      summary: `Positioning guide for ${launchName}.`,
      positioning_statement: `For ${primarySegment?.name ?? "teams"}, ${productName} is a solution that delivers better outcomes.`,
      differentiators: ["Differentiated value"],
      proof_points: ["Proof point"],
      objections: []
    });

    // ── Step 2: Message Map ───────────────────────────────────────────────────
    const mmText = await callClaude(
      anthropicKey,
      systemPrompt,
      `${sharedContext}

Positioning guide for this launch:
${JSON.stringify(pgJson, null, 2)}

Generate a message map. Return this exact JSON:
{
  "summary": "one sentence describing what this message map is for",
  "core_message": "the single hero statement for this launch — what we say to the world",
  "value_pillars": [
    { "pillar": "Pillar Name", "benefit": "customer benefit in their language", "proof": ["proof point 1", "proof point 2"] },
    { "pillar": "Pillar Name", "benefit": "customer benefit", "proof": ["proof 1", "proof 2"] },
    { "pillar": "Pillar Name", "benefit": "customer benefit", "proof": ["proof 1", "proof 2"] }
  ],
  "proof_library": ["proof point 1", "proof point 2", "proof point 3", "proof point 4"],
  "copy_blocks": {
    "headlines": ["headline variant 1", "headline variant 2", "headline variant 3"],
    "subhead": "supporting line for the hero message",
    "short_pitch": "2-sentence pitch a rep can say in a hallway conversation",
    "cta": "specific call to action for this launch"
  },
  "next_best_actions": ["immediate action for marketing", "immediate action for sales", "immediate action for product"]
}`
    );
    const mmJson = safeParseJson(mmText, {
      summary: `Message map for ${launchName}.`,
      core_message: `${productName} — ${launchDescription || "a better way forward"}`,
      value_pillars: [{ pillar: "Value", benefit: "Core benefit", proof: [] }],
      proof_library: [],
      copy_blocks: { headlines: [], subhead: "", short_pitch: "", cta: "" },
      next_best_actions: []
    });

    // ── Step 3: Launch Brief (GTM Plan) ───────────────────────────────────────
    const lbText = await callClaude(
      anthropicKey,
      systemPrompt,
      `${sharedContext}

${launchDate ? `The target launch date is ${launchDate}. Generate timeline phases with dates relative to this.` : "Use relative timing (e.g. T-4 weeks, T-2 weeks, Launch week, T+2 weeks)."}

Generate a launch brief and GTM plan. Return this exact JSON:
{
  "summary": "one paragraph brief summary — what this launch is, for whom, and why it matters now",
  "objective": "single measurable launch objective (what success looks like in 90 days)",
  "key_messages": ["audience-facing message 1", "message 2", "message 3", "message 4"],
  "timeline": [
    { "phase": "Strategy and Prep", "timing": "T-4 weeks", "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3"] },
    { "phase": "Production and Enablement", "timing": "T-2 to T-3 weeks", "deliverables": ["deliverable 1", "deliverable 2"] },
    { "phase": "Launch Week", "timing": "${launchDate || "Launch week"}", "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3"] },
    { "phase": "Post-Launch", "timing": "T+2 weeks", "deliverables": ["deliverable 1", "deliverable 2"] }
  ],
  "channels": ["primary channel with brief rationale", "second channel", "third channel"],
  "asset_checklist": ["asset 1", "asset 2", "asset 3", "asset 4", "asset 5", "asset 6"],
  "success_metrics": ["primary metric with specific target", "second metric", "third metric"]
}`
    );
    const lbJson = safeParseJson(lbText, {
      summary: `Launch brief for ${launchName}.`,
      objective: `Launch ${launchName} and drive measurable awareness and pipeline.`,
      key_messages: [],
      timeline: [],
      channels: [],
      asset_checklist: [],
      success_metrics: []
    });

    // ── Step 4: Sales Enablement ──────────────────────────────────────────────
    const seText = await callClaude(
      anthropicKey,
      systemPrompt,
      `${sharedContext}

Positioning guide:
${JSON.stringify(pgJson, null, 2)}

Core message: ${(mmJson as any)?.core_message ?? ""}

Generate a sales enablement pack. Return this exact JSON:
{
  "summary": "one sentence describing what this pack equips sales to do",
  "talk_track": [
    "opening statement — establish credibility and context",
    "problem framing — describe the pain in the customer's language",
    "solution bridge — connect problem to our solution",
    "differentiation — why we and not the alternative",
    "outcome statement — what good looks like after they choose us"
  ],
  "discovery_questions": [
    "question 1 — uncovers the core pain",
    "question 2 — uncovers urgency and timing",
    "question 3 — uncovers fit and budget",
    "question 4 — uncovers competitive situation"
  ],
  "competitive_angles": ["angle 1 — vs main competitor or status quo", "angle 2", "angle 3"],
  "objections": [
    { "objection": "specific objection reps hear most", "response": "honest, specific response with proof" },
    { "objection": "second objection", "response": "response" },
    { "objection": "third objection", "response": "response" }
  ],
  "email_templates": [
    { "type": "outbound", "subject": "subject line for cold outreach", "body": "email body — 3-4 sentences, ends with a specific ask" },
    { "type": "follow_up", "subject": "subject for follow-up after no reply", "body": "follow-up body — 2-3 sentences" }
  ],
  "deck_outline": [
    "Slide 1: title and context framing",
    "Slide 2: problem — cost of the status quo",
    "Slide 3: solution — what we do and for whom",
    "Slide 4: how it works — 3-step visual",
    "Slide 5: differentiation — why us over alternatives",
    "Slide 6: proof — customer outcome or case",
    "Slide 7: next steps"
  ]
}`
    );
    const seJson = safeParseJson(seText, {
      summary: `Sales enablement pack for ${launchName}.`,
      talk_track: [],
      discovery_questions: [],
      competitive_angles: [],
      objections: [],
      email_templates: [],
      deck_outline: []
    });

    // ── Save artifacts ────────────────────────────────────────────────────────
    const artifacts = [
      {
        artifact_type: "positioning_guide",
        title: `Positioning Guide — ${launchName}`,
        status: "ready" as const,
        content_json: { model: "claude-sonnet-4-6", kind, launchName, ...(pgJson as object) }
      },
      {
        artifact_type: "message_map",
        title: `Message Map — ${launchName}`,
        status: "ready" as const,
        content_json: { model: "claude-sonnet-4-6", kind, launchName, ...(mmJson as object) }
      },
      {
        artifact_type: "launch_brief",
        title: `Launch Brief — ${launchName}`,
        status: "ready" as const,
        content_json: { model: "claude-sonnet-4-6", kind, launchName, launchDate, tier, ...(lbJson as object) }
      },
      {
        artifact_type: "sales_enablement",
        title: `Sales Enablement Pack — ${launchName}`,
        status: "ready" as const,
        content_json: { model: "claude-sonnet-4-6", kind, launchName, ...(seJson as object) }
      }
    ];

    const { error: artErr } = await supabase.from("artifact_library_items").insert(
      artifacts.map((a) => ({
        environment_id: ctx.environmentId,
        product_id: ctx.productId,
        created_by: user.id,
        source_run_id: runId,
        ...a
      })) as any
    );

    // Update run status
    const finalStatus = artErr ? "failed" : "completed";
    await supabase
      .from("launch_playbook_runs")
      .update({
        status: finalStatus,
        output_json: {
          steps: ["insights", "narrative", "gtm", "enablement"].map((id) => ({
            id,
            status: finalStatus === "completed" ? "completed" : "failed"
          }))
        },
        finished_at: new Date().toISOString(),
        error: artErr?.message ?? null
      })
      .eq("id", runId);

    await supabase.rpc("increment_ai_quota", { p_user_id: user.id });
    const companyId = await getSelectedCompanyId();
    logActivity({ userId: user.id, companyId, event: "ai_query", module: "launch-playbook" });

    if (artErr) {
      return NextResponse.json({ ok: false, error: artErr.message, runId }, { status: 400 });
    }

    return NextResponse.json({ ok: true, runId });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
