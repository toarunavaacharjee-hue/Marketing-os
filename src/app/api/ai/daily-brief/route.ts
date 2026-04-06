import { NextResponse } from "next/server";
import { parseJsonObject } from "@/lib/extractJsonObject";
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
    lower.includes("billing") && lower.includes("credits")
  ) {
    return {
      status: 402,
      error:
        "Your Anthropic account has insufficient API credits. Add credits / enable billing in the Anthropic Console, then try again."
    };
  }
  return { status: 502, error: m || "Anthropic request failed." };
}

export async function POST() {
  try {
    const keyRes = await resolveWorkspaceAnthropicKey();
    if (!keyRes.ok) {
      return NextResponse.json({ error: keyRes.error }, { status: keyRes.status });
    }
    const key = keyRes.key;

    const system = `You write a tiny daily marketing digest for a SaaS dashboard. Output ONLY valid JSON. No markdown, no extra text.

Schema:
{
  "status": "ok" | "needs_input",
  "lines": ["max 8 lines; each under 90 chars; only if status ok"],
  "questions": ["max 3; only if needs_input — what data would you need to be specific?"],
  "message": "optional one line when needs_input"
}

Rules:
- Without real metrics from the user, use needs_input + short questions — do not invent numbers.
- If ok: lines cover 24h focus, 2–3 actions, 1 experiment, 1 risk — all brief.`;

    const prompt = `Task: JSON digest for "AI Marketing Workbench" operator view. No fake KPIs.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 220,
        temperature: 0.35,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      const normalized = normalizeAnthropicError(data?.error?.message);
      return NextResponse.json(
        { error: normalized.error, code: "ANTHROPIC_ERROR" },
        { status: normalized.status }
      );
    }

    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const raw = parseJsonObject(text);
    const st = String(raw?.status ?? "ok").toLowerCase();

    if (st === "needs_input") {
      const questions = Array.isArray(raw?.questions)
        ? (raw.questions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
        : [];
      const message = typeof raw?.message === "string" ? raw.message.trim() : "";
      const hint = [message, ...questions.map((q) => `• ${q}`)].filter(Boolean).join("\n");
      return NextResponse.json({
        summary: hint || "Connect analytics or describe your top goal — then refresh.",
        needs_input: true,
        questions
      });
    }

    const lines = Array.isArray(raw?.lines)
      ? (raw.lines as unknown[]).map((l) => String(l).trim()).filter(Boolean).slice(0, 10)
      : [];
    const summary = lines.length ? lines.join("\n") : text.trim() || "No summary returned.";

    return NextResponse.json({ summary, needs_input: false });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

