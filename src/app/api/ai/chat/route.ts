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

function richDemoReply(message: string) {
  const m = message.toLowerCase();

  if (m.includes("channel") || m.includes("roas") || m.includes("linkedin")) {
    return {
      response:
        "Channel readout: LinkedIn is softening at the top of funnel, while retargeting remains efficient. Shift 15% budget from broad LinkedIn audiences to high-intent retargeting and tighten CTA-message match on cold creatives.",
      metrics: [
        { label: "LinkedIn CTR", value: "0.71% (-22%)" },
        { label: "Blended ROAS", value: "3.4x" },
        { label: "Retargeting CPA", value: "$41 (+6%)" }
      ],
      suggestions: [
        "Give me a 7-day LinkedIn recovery plan",
        "Draft 5 new ad hooks",
        "Predict ROAS if we shift budget"
      ]
    };
  }

  if (m.includes("battlecard") || m.includes("competitor") || m.includes("vs")) {
    return {
      response:
        "Competitive pattern: prospects stall when ROI proof is vague and migration risk is unclear. Strengthen battlecards with quantified proof, implementation timeline, and objection-specific rebuttals by segment.",
      metrics: [
        { label: "Win Rate (Head-to-Head)", value: "38%" },
        { label: "Top Objection", value: "Switching friction" },
        { label: "Proof Gap", value: "Case studies outdated" }
      ],
      suggestions: [
        "Generate a competitor battlecard",
        "Write objection rebuttals",
        "Create proof-point slide copy"
      ]
    };
  }

  if (m.includes("gtm") || m.includes("brief") || m.includes("launch")) {
    return {
      response:
        "GTM brief recommendation: narrow ICP to 2 high-propensity segments, align one core value proposition per segment, and run a 14-day launch with daily creative iteration checkpoints.",
      metrics: [
        { label: "Target Segments", value: "2 priority ICPs" },
        { label: "Launch Window", value: "14 days" },
        { label: "Primary KPI", value: "SQL rate" }
      ],
      suggestions: [
        "Build a full GTM checklist",
        "Draft launch timeline",
        "Create messaging matrix"
      ]
    };
  }

  return {
    response:
      "Here is a practical starting point: focus this week on one growth bottleneck, one content multiplier, and one pipeline-risk fix. I can turn that into a detailed execution plan by channel if you share your current goal.",
    metrics: [
      { label: "Priority Areas", value: "3" },
      { label: "Time to Execute", value: "5-7 days" },
      { label: "Confidence", value: "High" }
    ],
    suggestions: [
      "Audit my funnel",
      "Write this week's plan",
      "Find top pipeline blockers"
    ]
  };
}

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
    payload = richDemoReply(message);
  } else {
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
  }

  // Increment usage after each successful response.
  await supabase
    .from("profiles")
    .update({ ai_queries_used: used + 1 })
    .eq("id", user.id);

  return NextResponse.json(payload);
}

