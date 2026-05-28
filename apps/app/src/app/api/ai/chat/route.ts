import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseJsonObject } from "@/lib/extractJsonObject";
import { getCompanyPlanForSelectedCompany } from "@/lib/companyContext";
import { getEntitlements, isAiMonthlyQuotaExceeded } from "@/lib/planEntitlements";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { gatherWorkspaceContext } from "@/lib/copilot/gatherWorkspaceContext";

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

type ProfileRow = {
  ai_queries_used?: number | null;
  company?: string | null;
  name?: string | null;
};

type HistoryMessage = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json()) as { message?: string; history?: HistoryMessage[] };
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const history: HistoryMessage[] = Array.isArray(body.history) ? body.history.slice(-10) : [];

  const profileSelect = await supabase
    .from("profiles")
    .select("ai_queries_used,company,name")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileSelect.data ?? null) as ProfileRow | null;

  const plan = (await getCompanyPlanForSelectedCompany()).toLowerCase();
  const used = profile?.ai_queries_used ?? 0;
  const company = profile?.company ?? "Unknown company";

  const ent = getEntitlements(plan);
  if (isAiMonthlyQuotaExceeded(ent, used)) {
    const cap = ent.aiQueriesPerMonth ?? 0;
    return NextResponse.json(
      {
        error: `You have reached your plan limit (${cap} AI workflow runs/month). Upgrade to Growth or Enterprise for unlimited runs.`,
        code: "UPGRADE_REQUIRED"
      },
      { status: 402 }
    );
  }

  const keyRes = await resolveWorkspaceAnthropicKey();
  if (!keyRes.ok) {
    return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });
  }
  const anthropicKey = keyRes.key;

  // Gather workspace context from all modules
  let workspaceContext = "";
  const productCtx = await getDefaultEnvironmentIdForSelectedProduct();
  if (productCtx) {
    workspaceContext = await gatherWorkspaceContext(
      supabase,
      productCtx.environmentId,
      productCtx.productId
    );
  }

  const systemPrompt = `You are the AI Copilot for AI Marketing Workbench. Output ONLY valid JSON. Minimize tokens — short strings, no prose outside JSON.

Context: plan=${plan}, company=${company}, user=${profile?.name ?? "Unknown"}${workspaceContext}

Schema:
{
  "status": "ok" | "needs_input",
  "message": "optional; one short line when needs_input",
  "questions": ["max 3; only if needs_input"],
  "response": "only if status ok; tactical answer grounded in the workspace context above, max ~450 chars",
  "metrics": [{"label":"","value":""}],
  "suggestions": ["max 3 follow-up prompts"]
}

Rules:
- Use the Workspace Context to give specific, grounded answers (reference actual segments, competitors, objections, campaigns by name).
- If the ask is too vague to act on, use status needs_input with questions only (no long response).
- If status ok: metrics 2–3 items, suggestions 3 items.
- No markdown fences, no keys outside the schema.`;

  // Build messages array including conversation history
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      temperature: 0.3,
      system: systemPrompt,
      messages
    })
  });

  const anthropicData = (await anthropicRes.json()) as AnthropicMessageResponse;
  if (!anthropicRes.ok) {
    return NextResponse.json(
      { error: anthropicData?.error?.message ?? "Anthropic request failed." },
      { status: 500 }
    );
  }

  const text = anthropicData.content?.find((x) => x.type === "text")?.text ?? "";
  const parsed = parseJsonObject(text) as {
    status?: string;
    message?: string;
    questions?: string[];
    response?: string;
    metrics?: Array<{ label?: string; value?: string }>;
    suggestions?: string[];
  } | null;

  const needsInput = String(parsed?.status ?? "ok").toLowerCase() === "needs_input";
  const qs = (parsed?.questions ?? []).filter(Boolean).slice(0, 4);
  let responseText =
    parsed?.response?.trim() ||
    (needsInput
      ? ""
      : text.trim() || "Ask a specific question (channel, metric, or asset) and I will give concrete next steps.");

  if (needsInput && qs.length) {
    const parts = [parsed?.message?.trim(), ...qs.map((q) => `• ${q}`)].filter(Boolean);
    responseText = parts.join("\n");
  } else if (needsInput && !responseText) {
    responseText =
      parsed?.message?.trim() ||
      "Add a bit more context (goal, channel, or timeframe), then send again.";
  }

  const sugg = (parsed?.suggestions ?? []).filter(Boolean).slice(0, 4);
  const payload = {
    needs_input: needsInput && qs.length > 0,
    message: parsed?.message ?? null,
    questions: qs,
    response: responseText,
    metrics:
      parsed?.metrics
        ?.filter((m) => m.label && m.value)
        .map((m) => ({ label: String(m.label), value: String(m.value) }))
        .slice(0, 4) ?? [],
    suggestions: sugg.length ? sugg : needsInput ? qs.slice(0, 3) : []
  };

  await supabase
    .from("profiles")
    .update({ ai_queries_used: used + 1 })
    .eq("id", user.id);

  return NextResponse.json(payload);
}
