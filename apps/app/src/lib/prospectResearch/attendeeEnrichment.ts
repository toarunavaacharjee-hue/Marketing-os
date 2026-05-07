import { resolveWorkspaceAnthropicKey } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { googleSearchViaSerpApi, type GoogleOrganicResult } from "@/lib/prospectResearch/googleSearch";
import { type AttendeeEnrichmentInput, type EnrichedStakeholder } from "@/lib/prospectResearch/stakeholderTypes";

type AnthropicContentBlock =
  | { type: "text"; text?: string }
  | { type: "tool_use"; id?: string; name?: string; input?: Record<string, unknown> };

type AnthropicMessageResponse = {
  content?: AnthropicContentBlock[];
  error?: { message?: string };
};

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function compactResults(results: GoogleOrganicResult[], limit = 6): string {
  const rows = results.slice(0, limit).map((r, idx) => {
    const title = asStr(r.title) || "(no title)";
    const link = asStr(r.link);
    const snippet = asStr(r.snippet);
    return `#${idx + 1}: ${title}\n${link}\n${snippet}`.trim();
  });
  return rows.join("\n\n---\n\n");
}

async function callAnthropicTool(args: {
  apiKey: string;
  system: string;
  user: string;
  toolName: string;
  toolSchema: Record<string, unknown>;
  maxTokens: number;
  temperature: number;
}): Promise<{ ok: true; input: Record<string, unknown> } | { ok: false; error: string }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      system: args.system,
      tools: [{ name: args.toolName, description: "Return structured attendee enrichment.", input_schema: args.toolSchema }],
      tool_choice: { type: "tool", name: args.toolName },
      messages: [{ role: "user", content: args.user }]
    })
  });
  const data = (await res.json()) as AnthropicMessageResponse;
  if (!res.ok) return { ok: false, error: data?.error?.message ?? "Anthropic request failed." };
  const block = data.content?.find((c) => c.type === "tool_use" && (c as any).name === args.toolName) as
    | { type: "tool_use"; input?: Record<string, unknown> }
    | undefined;
  const input = block?.input;
  if (!input || typeof input !== "object") return { ok: false, error: "Model did not return structured tool output." };
  return { ok: true, input };
}

const TOOL_NAME = "attendee_enrichment";
const TOOL_SCHEMA = {
  type: "object",
  properties: {
    full_name: { type: "string" },
    title: { type: "string" },
    company_name: { type: "string" },
    linkedin_url: { type: "string" },
    department: { type: "string" },
    location: { type: "string" },
    confidence: { type: "string", description: "high|medium|low" },
    notes: { type: "string", description: "1-3 bullets explaining the match and evidence." }
  },
  required: ["full_name", "title", "company_name", "linkedin_url", "department", "location", "confidence", "notes"],
  additionalProperties: false
} as const;

export async function enrichAttendeesWithGoogle(args: {
  attendees: AttendeeEnrichmentInput[];
  companyHint?: string;
  websiteHint?: string;
}): Promise<EnrichedStakeholder[]> {
  const keyRes = await resolveWorkspaceAnthropicKey();
  if (!keyRes.ok) {
    return args.attendees.map((a) => ({
      email: a.email,
      source: "google",
      matchStatus: "error",
      fullName: a.fullName,
      note: keyRes.error
    }));
  }

  const out: EnrichedStakeholder[] = [];
  for (const attendee of args.attendees) {
    const name = asStr(attendee.fullName);
    const email = asStr(attendee.email).toLowerCase();
    const company = asStr(attendee.companyName) || asStr(args.companyHint) || asStr(args.websiteHint);
    const titleHint = asStr(attendee.title);

    if (!name && !email) {
      out.push({
        email: attendee.email,
        fullName: attendee.fullName,
        source: "google",
        matchStatus: "error",
        note: "Missing name/email."
      });
      continue;
    }

    const emailDomain = email.includes("@") ? email.split("@")[1] : "";
    const base = [name || email, company || emailDomain].filter(Boolean).join(" ");

    // Queries roughly mimic “Google + LinkedIn search”.
    const queries = [
      `site:linkedin.com/in ${base}`.trim(),
      `"${name || email}" ${company || emailDomain}`.trim(),
      `"${name || email}" "${company || emailDomain}" LinkedIn`.trim()
    ].filter(Boolean);

    const allResults: GoogleOrganicResult[] = [];
    for (const q of queries) {
      const res = await googleSearchViaSerpApi({ query: q, num: 5 });
      if (res.ok) allResults.push(...res.results);
    }

    // Prefer linkedin links, then everything else.
    const ranked = [
      ...allResults.filter((r) => (r.link || "").toLowerCase().includes("linkedin.com/in/")),
      ...allResults.filter((r) => !(r.link || "").toLowerCase().includes("linkedin.com/in/"))
    ].slice(0, 8);

    if (ranked.length === 0) {
      out.push({
        email: attendee.email,
        fullName: attendee.fullName,
        source: "google",
        matchStatus: "not_found",
        note: "No search results."
      });
      continue;
    }

    const system = `You are a B2B sales intelligence analyst.
You are given Google search results snippets for a person (often LinkedIn + company pages).
Extract the best-matching person record. If ambiguous, choose the best match and set confidence=low.
Do NOT invent facts. If a field is unknown, return "TBD".`;

    const user = `Attendee input:
- name: ${name || "(not provided)"}
- email: ${email || "(not provided)"}
- company hint: ${company || "(none)"}
- title hint: ${titleHint || "(none)"}

Google results (top):
${compactResults(ranked)}
`;

    const tool = await callAnthropicTool({
      apiKey: keyRes.key,
      system: `${system}\n\nCall the tool ${TOOL_NAME} exactly once.`,
      user,
      toolName: TOOL_NAME,
      toolSchema: TOOL_SCHEMA as any,
      maxTokens: 800,
      temperature: 0
    });

    if (!tool.ok) {
      out.push({
        email: attendee.email,
        fullName: attendee.fullName,
        source: "google",
        matchStatus: "error",
        note: tool.error
      });
      continue;
    }

    const i = tool.input as any;
    const linkedinUrl = asStr(i.linkedin_url);
    out.push({
      email: attendee.email || undefined,
      source: "google",
      matchStatus: "matched",
      fullName: asStr(i.full_name) || attendee.fullName,
      title: asStr(i.title) || undefined,
      companyName: asStr(i.company_name) || undefined,
      companyDomain: undefined,
      department: asStr(i.department) || undefined,
      location: asStr(i.location) || undefined,
      linkedinUrl: linkedinUrl && linkedinUrl !== "TBD" ? linkedinUrl : attendee.linkedinUrl,
      note: asStr(i.notes) || undefined
    });
  }

  return out;
}

