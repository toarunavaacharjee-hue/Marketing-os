import { NextResponse } from "next/server";
import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";

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
  // Treat most provider failures as temporary upstream unavailability.
  return { status: 503, error: m || "AI provider temporarily unavailable." };
}

export async function POST() {
  try {
    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) {
      return NextResponse.json(
        { ok: false, error: keyRes.error },
        { status: keyRes.status }
      );
    }
    const key = keyRes.key;

    // Minimal request to validate key works.
    const controller = new AbortController();
    const timeoutMs = 12_000;
    const t = setTimeout(() => controller.abort(), timeoutMs);
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
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(t));

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      const normalized = normalizeAnthropicError(data?.error?.message);
      console.error("Anthropic ping failed", {
        status: res.status,
        providerMessage: data?.error?.message
      });
      return NextResponse.json(
        { ok: false, error: normalized.error },
        { status: normalized.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.error("Anthropic ping timed out");
      return NextResponse.json(
        { ok: false, error: "AI provider temporarily unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

