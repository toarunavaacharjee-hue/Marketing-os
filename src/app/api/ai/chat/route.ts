import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as {
      response?: string;
      metrics?: Array<{ label?: string; value?: string }>;
      suggestions?: string[];
    };
  } catch {
    return null;
  }
}

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

  let payload: {
    response: string;
    metrics: Array<{ label: string; value: string }>;
    suggestions: string[];
  };

  if (!anthropicKey) {
    return NextResponse.json(
      {
        error:
          "Missing Anthropic API key. Add your key in the sidebar or Settings before using AI Copilot."
      },
      { status: 400 }
    );
  }

  const systemPrompt = `You are the AI Copilot for Marketing OS.
Context:
- User plan: ${plan}
- Company: ${company}
- User name: ${profile?.name ?? "Unknown"}

Return JSON only with this shape:
{
  "response": "short practical answer",
  "metrics": [{"label":"...", "value":"..."}],
  "suggestions": ["...", "...", "..."]
}

Rules:
- Keep response concrete and tactical.
- metrics array should contain 2-4 cards.
- suggestions should contain 3 clickable follow-ups.
- No markdown code fences.`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      temperature: 0.35,
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
  const parsed = extractJsonObject(text);

  payload = {
    response:
      parsed?.response ??
      text ??
      "I analyzed your request and can help draft a focused action plan.",
    metrics:
      parsed?.metrics
        ?.filter((m) => m.label && m.value)
        .map((m) => ({ label: m.label!, value: m.value! })) ?? [],
    suggestions: parsed?.suggestions?.slice(0, 5) ?? []
  };

  // Increment usage after each successful response.
  await supabase
    .from("profiles")
    .update({ ai_queries_used: used + 1 })
    .eq("id", user.id);

  return NextResponse.json(payload);
}

