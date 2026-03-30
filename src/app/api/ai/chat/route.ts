import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseJsonObject } from "@/lib/extractJsonObject";

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

type ProfileRow = {
  plan?: string | null;
  ai_queries_used?: number | null;
  company?: string | null;
  name?: string | null;
  anthropic_api_key?: string | null;
};

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json()) as { message?: string };
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const profileSelect = await supabase
    .from("profiles")
    .select("plan,ai_queries_used,company,name,anthropic_api_key")
    .eq("id", user.id)
    .single();

  let profile: ProfileRow | null = null;
  if (profileSelect.error) {
    const fallback = await supabase
      .from("profiles")
      .select("plan,ai_queries_used,company,name")
      .eq("id", user.id)
      .single();
    profile = (fallback.data ?? null) as ProfileRow | null;
  } else {
    profile = (profileSelect.data ?? null) as ProfileRow | null;
  }

  const plan = (profile?.plan ?? "starter").toLowerCase();
  const used = profile?.ai_queries_used ?? 0;
  const company = profile?.company ?? "Unknown company";
  // Key priority:
  // 1) Per-request header (user pastes key in UI; stored in localStorage)
  // 2) Profile column (optional if you decide to store it server-side later)
  // 3) Server env var (team-wide default)
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
          "You have reached your Starter plan limit (100 AI queries/month). Upgrade to Growth or Enterprise for unlimited queries.",
        code: "UPGRADE_REQUIRED"
      },
      { status: 402 }
    );
  }

  if (!anthropicKey) {
    return NextResponse.json(
      {
        error:
          "Missing Anthropic API key. Add your key in the sidebar or Settings before using AI Copilot."
      },
      { status: 400 }
    );
  }

  const systemPrompt = `You are the AI Copilot for AI Marketing Workbench. Output ONLY valid JSON. Minimize tokens — short strings, no prose outside JSON.

Context: plan=${plan}, company=${company}, user=${profile?.name ?? "Unknown"}

Schema:
{
  "status": "ok" | "needs_input",
  "message": "optional; one short line when needs_input",
  "questions": ["max 3; only if needs_input"],
  "response": "only if status ok; tactical answer, max ~350 chars",
  "metrics": [{"label":"","value":""}],
  "suggestions": ["max 3 follow-up prompts"]
}

Rules:
- If the ask is too vague to act on, use status needs_input with questions only (no long response).
- If status ok: metrics 2–3 items, suggestions 3 items.
- No markdown fences, no keys outside the schema.`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 320,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: "user", content: message }]
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

  // Increment usage after each successful response.
  await supabase
    .from("profiles")
    .update({ ai_queries_used: used + 1 })
    .eq("id", user.id);

  return NextResponse.json(payload);
}


