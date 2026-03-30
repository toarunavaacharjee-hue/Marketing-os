import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { parseJsonObject } from "@/lib/extractJsonObject";

function sliceText(s: string | null | undefined, max: number) {
  const t = (s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

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
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected)
      return NextResponse.json({ error: "No product selected." }, { status: 400 });
    const { productId, environmentId } = selected;

    const body = (await req.json()) as { question?: string };
    const question = (body.question ?? "").trim();
    if (!question)
      return NextResponse.json({ error: "Question is required." }, { status: 400 });

    const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
    const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();

    const { data: scan, error: sErr } = await supabase
      .from("research_scans")
      .select("id,summary,created_at")
      .eq("environment_id", environmentId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  if (!scan?.id) {
    return NextResponse.json(
      { error: "No scan found. Click “Run scan” first." },
      { status: 400 }
    );
  }

  const { data: snaps, error: snapsErr } = await supabase
    .from("research_snapshots")
    .select("url,source_type,title,text_content")
    .eq("scan_id", scan.id)
    .order("fetched_at", { ascending: true })
    .limit(12);
  if (snapsErr) return NextResponse.json({ error: snapsErr.message }, { status: 500 });

  if (!anthropicKey) {
    return NextResponse.json(
      {
        error:
          "Missing Anthropic API key. Add your key in the sidebar or Settings, then ask again."
      },
      { status: 400 }
    );
  }

  const snapshotContext = (snaps ?? [])
    .map((s, idx) => {
      const title = s.title ? `${s.title} ` : "";
      return `[${idx + 1}:${s.source_type}] ${title}${sliceText(s.text_content as string, 500)}`;
    })
    .join("\n");

  const system = `You answer Market Research questions using ONLY the provided summary + snapshot excerpts. Output ONLY valid JSON. Minimize tokens.

Schema:
{
  "status": "ok" | "needs_input",
  "answer": "short; only if ok; max ~500 chars; bullets use \\n",
  "questions": ["max 3; only if needs_input — what to clarify or re-scan"],
  "message": "optional one line when needs_input"
}

Rules:
- If snapshots don't support a solid answer, use needs_input with questions — do not invent facts.
- No markdown fences, no text outside JSON.`;

  const prompt = `Summary:\n${sliceText(scan.summary as string, 900)}\n\nSnaps:\n${snapshotContext || "(none)"}\n\nQ:\n${sliceText(question, 500)}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 380,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = (await res.json()) as AnthropicMessageResponse;
  if (!res.ok) {
    const normalized = normalizeAnthropicError(data?.error?.message);
    return NextResponse.json({ error: normalized.error }, { status: normalized.status });
  }

  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const raw = parseJsonObject(text);
  const st = String(raw?.status ?? "ok").toLowerCase();

  if (st === "needs_input") {
    const questions = Array.isArray(raw?.questions)
      ? (raw.questions as unknown[]).map((q) => String(q).trim()).filter(Boolean).slice(0, 4)
      : [];
    const message = typeof raw?.message === "string" ? raw.message.trim() : "";
    const answer = [message, ...questions.map((q) => `• ${q}`)].filter(Boolean).join("\n");
    return NextResponse.json({
      answer: answer || "Re-run a scan or narrow your question.",
      needs_input: true,
      questions
    });
  }

  const answer =
    typeof raw?.answer === "string" && raw.answer.trim()
      ? raw.answer.trim()
      : text.trim() || "No answer returned.";
  return NextResponse.json({ answer, needs_input: false });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

