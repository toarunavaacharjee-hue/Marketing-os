import { parseJsonObject } from "@/lib/extractJsonObject";
import {
  emptyProspectMemo,
  normalizeProspectMemo,
  type ProspectIntelligenceMemo
} from "@/lib/prospectIntelligenceTypes";

const MODEL = process.env.ANTHROPIC_MARKET_RESEARCH_MODEL?.trim() || "claude-sonnet-4-6";
// Keep this comfortably under common serverless/proxy timeouts to avoid dropped HTTP/2 connections.
const TIMEOUT_MS = 55_000;

type AnthropicMessageResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message?: string };
};

export type GenInput = {
  accountName: string;
  companyName?: string;
  websiteUrl?: string;
  dealStage?: string;
  /** Recipient(s) of the memo, e.g. "Andrew Toppin & Marketing Team" */
  preparedFor?: string;
  /** Demo or meeting line, e.g. "April 17, 2026, 10:00–11:00 AM PT" */
  demoOrMeetingDate?: string;
  /** Seller / AE name for "Sales Strategy Notes for {seller}" framing */
  sellerName?: string;
  additionalContext?: string;
};

function buildUserMessage(input: GenInput): string {
  const preparedFor = input.preparedFor?.trim() || "(not provided)";
  const demo = input.demoOrMeetingDate?.trim() || "(not provided)";
  const seller = input.sellerName?.trim() || "(not provided — use generic seller-facing notes)";
  return `# PROSPECT INTELLIGENCE MEMO (inputs)

Account / opportunity name: ${input.accountName}
Company name: ${input.companyName?.trim() || "(same as account or unknown)"}
Website: ${input.websiteUrl?.trim() || "(not provided)"}
Deal stage: ${input.dealStage?.trim() || "(not provided)"}
Prepared for: ${preparedFor}
Demo / meeting: ${demo}
Seller / AE name (for sales notes section): ${seller}

Additional context from seller:
${(input.additionalContext ?? "").trim() || "(none)"}`;
}

const SYSTEM = `You are a B2B sales intelligence analyst. Produce a Prospect Intelligence Memo as JSON only.
Use web-reasonable general knowledge and logical inference from the inputs provided. If data is unknown, say so in tables and gaps — do not invent facts.
Each section value is GitHub-flavored Markdown. Be thorough and specific (dense memos like internal sales briefs), not generic one-liners.

Formatting (mirror professional sales intel briefs):
- In executive_summary, START with a title block:
  - Line 1: \`# PROSPECT INTELLIGENCE MEMO\`
  - Line 2: \`## {Account or company display name}\`
  - Line 3: metadata line using pipes, e.g. \`Prepared: {date or TBD}  |  For: {preparedFor or TBD}  |  Demo: {demoOrMeetingDate or TBD}\` (use inputs when provided).
  - Then "### Executive Summary" and 2–4 tight paragraphs: who they are, why it matters, deal posture, next step.
  - Include a small markdown table for deal meta: Primary contact, Secondary, Stage, Expected next milestone (use TBD where unknown).
- Group stakeholders in key_decision_makers with \`###\` subsections (e.g. Executive Leadership, Operations, Technology, Partners) — each with a markdown table: Name | Title | Organization | Notes. Include plausible roles even if names are TBD.
- In organizational_context include "### Recent Strategic Moves" as a dated bullet list (newest first; infer cautiously or mark unknown) and "### Technology Landscape" bullets.
- In sales_strategy_notes, if a seller name was provided in inputs, use "### Sales Strategy Notes for {seller}". Include "### Key Messaging Themes" bullets and "### Competitive Positioning" with a comparison table (criteria vs us vs alternatives/TBD).
- meeting_demo_prep: "### Demo Prep Recommendations" with actionable bullets; "### Discovery Questions".

Output a single JSON object with exactly these keys (no extra keys):
{
  "executive_summary": "...",
  "what_theyre_looking_for": "...",
  "key_decision_makers": "...",
  "organizational_context": "...",
  "sales_strategy_notes": "...",
  "open_intelligence_gaps": "...",
  "meeting_demo_prep": "...",
  "research_sources": "..."
}

Section requirements:
1) executive_summary: Title block + exec summary + meta table as above.
2) what_theyre_looking_for: Bullets for buying criteria, pain points, trigger events; use their vocabulary when present in context.
3) key_decision_makers: Grouped stakeholder tables with ### headings.
4) organizational_context: Structure, recent moves (dated when possible), tech stack hints, compliance posture if relevant.
5) sales_strategy_notes: Messaging, positioning table, objection handling; seller-specific section title when seller name known.
6) open_intelligence_gaps: Table: Gap | Why it matters | How to close.
7) meeting_demo_prep: Tailored demo agenda, discovery questions, prep checklist.
8) research_sources: Honest list — user context, general knowledge, and gaps; avoid fake URLs.

Prefer clarity and usable detail over length, but each section should feel "memo-complete" not sparse.`;

export async function generateProspectMemo(
  anthropicKey: string,
  input: GenInput,
  opts?: { signal?: AbortSignal }
): Promise<{ ok: true; memo: ProspectIntelligenceMemo } | { ok: false; error: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const user = buildUserMessage(input);
  const outerSignal = opts?.signal;
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        // Reducing tokens improves latency and reduces timeouts in serverless environments.
        max_tokens: 4000,
        temperature: 0.35,
        system: SYSTEM,
        messages: [{ role: "user", content: user }]
      })
    });
    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error?.message ?? "Anthropic request failed."
      };
    }
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(text);
    if (!parsed) {
      return { ok: false, error: "AI returned invalid JSON. Try again with more context." };
    }
    const memo = normalizeProspectMemo(parsed);
    return { ok: true, memo };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("abort")) {
      return { ok: false, error: "AI request timed out. Try again with a shorter context or retry." };
    }
    return { ok: false, error: msg || "Network error." };
  } finally {
    clearTimeout(t);
    if (outerSignal) outerSignal.removeEventListener("abort", onOuterAbort);
  }
}

export async function retryProspectMemoStrict(
  anthropicKey: string,
  input: GenInput,
  opts?: { signal?: AbortSignal }
): Promise<{ ok: true; memo: ProspectIntelligenceMemo } | { ok: false; error: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const strict = `${SYSTEM}

STRICT: Return ONLY minified JSON. No markdown fences. All 8 string keys must be non-empty (use "TBD" if needed).`;

  const user = buildUserMessage(input);
  const outerSignal = opts?.signal;
  const onOuterAbort = () => controller.abort();
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort();
    else outerSignal.addEventListener("abort", onOuterAbort, { once: true });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        temperature: 0.2,
        system: strict,
        messages: [{ role: "user", content: user }]
      })
    });
    const data = (await res.json()) as AnthropicMessageResponse;
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? "Anthropic request failed." };
    }
    const text = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = parseJsonObject(text);
    if (!parsed) {
      return { ok: false, error: "AI returned invalid JSON." };
    }
    return { ok: true, memo: normalizeProspectMemo(parsed) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("abort")) {
      return { ok: false, error: "AI request timed out." };
    }
    return { ok: false, error: msg || "Network error." };
  } finally {
    clearTimeout(t);
    if (outerSignal) outerSignal.removeEventListener("abort", onOuterAbort);
  }
}

export function memoToMarkdownContext(memo: ProspectIntelligenceMemo): string {
  const m = memo ?? emptyProspectMemo();
  return [
    "## Executive Summary\n\n" + m.executive_summary,
    "## What They're Looking For\n\n" + m.what_theyre_looking_for,
    "## Key Decision Makers\n\n" + m.key_decision_makers,
    "## Organizational Context\n\n" + m.organizational_context,
    "## Sales Strategy Notes\n\n" + m.sales_strategy_notes,
    "## Open Intelligence Gaps\n\n" + m.open_intelligence_gaps,
    "## Meeting / Demo Prep\n\n" + m.meeting_demo_prep,
    "## Research Sources\n\n" + m.research_sources
  ].join("\n\n---\n\n");
}
