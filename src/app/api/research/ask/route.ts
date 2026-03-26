import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

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
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const selected = await getDefaultEnvironmentIdForSelectedProduct();
  if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });
  const { productId, environmentId } = selected;

  const body = (await req.json()) as { question?: string };
  const question = (body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "Question is required." }, { status: 400 });

  const headerKey = req.headers.get("x-anthropic-key")?.trim() ?? "";
  const anthropicKey = (headerKey || process.env.ANTHROPIC_API_KEY || "").trim();

  const admin = createSupabaseAdminClient();

  const { data: scan } = await admin
    .from("research_scans")
    .select("id,summary,created_at")
    .eq("environment_id", environmentId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!scan?.id) {
    return NextResponse.json(
      { error: "No scan found. Click “Run scan” first." },
      { status: 400 }
    );
  }

  const { data: snaps } = await admin
    .from("research_snapshots")
    .select("url,source_type,title,text_content")
    .eq("scan_id", scan.id)
    .order("fetched_at", { ascending: true })
    .limit(10);

  if (!anthropicKey) {
    return NextResponse.json({
      answer:
        "Demo answer (no Anthropic key provided). Run a scan with your key for a real answer.\n\n" +
        `Question: ${question}\n` +
        "Suggestion: add competitors + re-run scan, then ask again."
    });
  }

  const snapshotContext = (snaps ?? [])
    .map((s, idx) => {
      const title = s.title ? `Title: ${s.title}\n` : "";
      return `#${idx + 1} ${s.source_type.toUpperCase()}\nURL: ${s.url}\n${title}${(s.text_content as string).slice(0, 2500)}\n`;
    })
    .join("\n---\n");

  const system = `You answer questions for the Market Research module in Marketing OS.
Use the scan summary and website snapshots as your only sources.
Be concise, structured, and actionable.
If the answer is not supported by the snapshots, say what’s missing and what to scan next.`;

  const prompt = `Latest scan summary:\n${scan.summary ?? "(none)"}\n\nSnapshots:\n${snapshotContext}\n\nQuestion:\n${question}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      temperature: 0.35,
      system,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = (await res.json()) as AnthropicMessageResponse;
  if (!res.ok) {
    const normalized = normalizeAnthropicError(data?.error?.message);
    return NextResponse.json({ error: normalized.error }, { status: normalized.status });
  }

  const answer = data.content?.find((c) => c.type === "text")?.text ?? "No answer returned.";
  return NextResponse.json({ answer });
}

