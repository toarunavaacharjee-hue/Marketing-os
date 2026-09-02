import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseJsonObject } from "@/lib/extractJsonObject";
import { getCompanyPlanForSelectedCompany } from "@/lib/companyContext";
import { getEntitlements, isAiMonthlyQuotaExceeded } from "@/lib/planEntitlements";
import { logActivity } from "@/lib/analytics/logActivity";
import { getSelectedCompanyId } from "@/lib/companyContext";
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

  const body = (await req.json()) as { message?: string; history?: HistoryMessage[]; signal?: string };
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  const history: HistoryMessage[] = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const signal = (body.signal ?? "").trim();

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

  const signalBlock = signal
    ? `\n\nACTIVE SIGNAL (highest priority — ground your entire response in this): "${signal}"\nPopulate suggested_updates with the 1–3 most relevant modules to act on.`
    : "";

  const moduleList = `
Available modules (use exact hrefs in suggested_updates):
- Market Research: /dashboard/market-research
- Positioning Studio: /dashboard/positioning-studio
- ICP Segmentation: /dashboard/icp-segmentation
- Battlecards: /dashboard/battlecards
- Messaging & Artifacts: /dashboard/messaging-artifacts
- Campaigns: /dashboard/campaigns
- GTM Planner: /dashboard/gtm-planner
- Content Studio: /dashboard/content-studio
- Sales Intelligence: /dashboard/sales-intelligence`;

  const systemPrompt = `You are the AI Copilot for AI Marketing Workbench. Output ONLY valid JSON. Minimize tokens — short strings, no prose outside JSON.

Context: plan=${plan}, company=${company}, user=${profile?.name ?? "Unknown"}${workspaceContext}${signalBlock}
${signal ? moduleList : ""}

Schema:
{
  "status": "ok" | "needs_input",
  "message": "optional; one short line when needs_input",
  "questions": ["max 3; only if needs_input"],
  "response": "only if status ok; tactical answer grounded in workspace context, max ~450 chars",
  "metrics": [{"label":"","value":""}],
  "suggestions": ["max 3 follow-up prompts"],
  "suggested_updates": [{"module":"module name","href":"/dashboard/...","action":"what to update — 1 sentence"}]
}

Rules:
- Use the Workspace Context to give specific, grounded answers (reference actual segments, competitors, objections, campaigns by name).
- If an ACTIVE SIGNAL is present, respond specifically to it — do not give generic advice.
- If the ask is too vague to act on, use status needs_input with questions only (no long response).
- If status ok: metrics 2–3 items, suggestions 3 items.
- suggested_updates: only when a clear asset update is implied (max 3); omit the field otherwise.
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
      max_tokens: signal ? 800 : 600,
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
    suggested_updates?: Array<{ module?: string; href?: string; action?: string }>;
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
  const suggestedUpdates = (parsed?.suggested_updates ?? [])
    .filter((u) => u.module && u.href && u.action)
    .map((u) => ({ module: String(u.module), href: String(u.href), action: String(u.action) }))
    .slice(0, 3);

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
    suggestions: sugg.length ? sugg : needsInput ? qs.slice(0, 3) : [],
    suggested_updates: suggestedUpdates
  };

  await supabase.rpc("increment_ai_quota", { p_user_id: user.id });
  logActivity({ userId: user.id, companyId: await getSelectedCompanyId(), event: "ai_query", module: "copilot" });

  return NextResponse.json(payload);
}
