import { NextResponse } from "next/server";

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

function normalizeAnthropicError(message: string | undefined) {
  const m = (message ?? "").trim();
  const lower = m.toLowerCase();
  if (
    lower.includes("credit balance is too low") ||
    lower.includes("insufficient credits") ||
    (lower.includes("billing") && lower.includes("credits"))
  ) {
    return {
      status: 402,
      error:
        "Insufficient Anthropic API credits. Add credits / enable billing in Anthropic Console."
    };
  }
  return { status: 502, error: m || "Anthropic request failed." };
}

export async function POST(req: Request) {
  try {
    const headerKey = req.headers.get("x-anthropic-key")?.trim();
    const key = headerKey || process.env.ANTHROPIC_API_KEY || "";

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Missing Anthropic API key." },
        { status: 400 }
      );
    }

    // Minimal request to validate key works.
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1,
        temperature: 0,
        messages: [{ role: "user", content: "ping" }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      const normalized = normalizeAnthropicError(data?.error?.message);
      return NextResponse.json(
        { ok: false, error: normalized.error },
        { status: normalized.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

