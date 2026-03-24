import { NextResponse } from "next/server";

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

export async function POST(req: Request) {
  try {
    const headerKey = req.headers.get("x-anthropic-key")?.trim();
    const key = headerKey || process.env.ANTHROPIC_API_KEY || "";

    if (!key) {
      return NextResponse.json(
        { error: "Missing Anthropic API key. Add it in the sidebar." },
        { status: 400 }
      );
    }

    const prompt = `Write a concise daily marketing performance digest for a SaaS called Marketing OS.
Use demo data. Keep it action-oriented and specific.

Include:
- What changed in the last 24h
- 3 priority actions (bullets)
- 1 experiment to run
- 1 risk to watch

Tone: confident, crisp, not salesy.
Length: 8-12 lines.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 320,
        temperature: 0.4,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Anthropic request failed." },
        { status: 500 }
      );
    }

    const text =
      data.content?.find((c) => c.type === "text")?.text ??
      "No summary returned.";

    return NextResponse.json({ summary: text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

