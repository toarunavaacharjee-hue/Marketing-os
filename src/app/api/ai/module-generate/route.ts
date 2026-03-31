import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getDefaultEnvironmentIdForSelectedProduct,
  getSelectedProductId
} from "@/lib/productContext";
import { getCompanyPlanForSelectedCompany } from "@/lib/companyContext";

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
};

type ProfileRow = {
  ai_queries_used?: number | null;
  anthropic_api_key?: string | null;
};

/**
 * Single-shot marketing copy / analysis for module workbenches (Content, Social, etc.).
 * Same auth + usage limits as /api/ai/chat.
 */
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json()) as {
    prompt?: string;
    system?: string;
    tone?: string;
    length?: string;
  };

  const promptRaw = (body.prompt ?? "").trim();
  if (!promptRaw) {
    return NextResponse.json({ error: "prompt is required." }, { status: 400 });
  }

  const tone = (body.tone ?? "").trim();
  const length = (body.length ?? "").trim();
  const hints: string[] = [];
  if (tone) hints.push(`Requested tone: ${tone}.`);
  if (length) {
    const depth =
      length === "short"
        ? "Keep the draft brief: tight sections, minimal elaboration."
        : length === "long"
          ? "Develop the draft fully: multiple sections, examples, and actionable detail as appropriate."
          : "Use a balanced depth: clear sections with enough detail to be useful.";
    hints.push(`Requested length: ${length}. ${depth}`);
  }
  const prompt = hints.length ? `${hints.join(" ")}\n\n---\n\n${promptRaw}` : promptRaw;

  const systemCustom = (body.system ?? "").trim();

  const maxTokens =
    length === "long" ? 4096 : length === "short" ? 1200 : 2048;

  const profileSelect = await supabase
    .from("profiles")
    .select("ai_queries_used,anthropic_api_key")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileSelect.data ?? null) as ProfileRow | null;
  const plan = (await getCompanyPlanForSelectedCompany()).toLowerCase();
  const used = profile?.ai_queries_used ?? 0;

  const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
  const anthropicKey = (
    headerKey ||
    (profile?.anthropic_api_key ?? "").trim() ||
    process.env.ANTHROPIC_API_KEY ||
    ""
  ).trim();

  if (plan === "starter" && used >= 100) {
    return NextResponse.json(
      {
        error:
          "Starter plan limit reached (100 AI queries/month). Upgrade for unlimited.",
        code: "UPGRADE_REQUIRED"
      },
      { status: 402 }
    );
  }

  if (!anthropicKey) {
    return NextResponse.json(
      { error: "Add your Anthropic API key in the sidebar or Settings." },
      { status: 400 }
    );
  }

  const productId = await getSelectedProductId();
  let productBrief = "";
  if (productId) {
    const { data: p } = await supabase
      .from("products")
      .select("name,category,icp_summary,positioning_summary")
      .eq("id", productId)
      .maybeSingle();
    if (p) {
      productBrief = `Product: ${(p as { name?: string }).name ?? ""}
Category: ${(p as { category?: string }).category ?? ""}
ICP: ${(p as { icp_summary?: string }).icp_summary ?? ""}
Positioning: ${(p as { positioning_summary?: string }).positioning_summary ?? ""}`;
    }
  }

  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  let segmentsBrief = "";
  if (ctx?.environmentId) {
    const { data: segs } = await supabase
      .from("segments")
      .select("name,pnf_score,pain_points")
      .eq("environment_id", ctx.environmentId)
      .order("created_at", { ascending: false })
      .limit(8);
    if (segs?.length) {
      segmentsBrief = (segs as { name: string; pnf_score: number; pain_points: string[] }[])
        .map((s) => `${s.name} (PNF ${s.pnf_score}): ${(s.pain_points ?? []).join("; ")}`)
        .join("\n");
    }
  }

  const system = `${systemCustom || "You are a senior B2B marketing strategist. Be concise and actionable."}

${productBrief ? `--- Product context ---\n${productBrief}\n` : ""}
${segmentsBrief ? `--- ICP segments ---\n${segmentsBrief}\n` : ""}

Output plain text only (no JSON, no markdown code fences unless formatting helps readability).`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature: 0.35,
      system,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = (await res.json()) as AnthropicMessageResponse;
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? "Anthropic request failed." },
      { status: 502 }
    );
  }

  const text = data.content?.find((c) => c.type === "text")?.text ?? "";

  await supabase
    .from("profiles")
    .update({ ai_queries_used: used + 1 })
    .eq("id", user.id);

  return NextResponse.json({ text: text.trim() });
}
