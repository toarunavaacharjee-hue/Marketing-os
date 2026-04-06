/**
 * Prospect Intelligence Memo — 8 sections (markdown strings; tables as markdown).
 */
export type ProspectIntelligenceMemo = {
  executive_summary: string;
  what_theyre_looking_for: string;
  key_decision_makers: string;
  organizational_context: string;
  sales_strategy_notes: string;
  open_intelligence_gaps: string;
  meeting_demo_prep: string;
  research_sources: string;
};

export const PROSPECT_MEMO_KEYS: (keyof ProspectIntelligenceMemo)[] = [
  "executive_summary",
  "what_theyre_looking_for",
  "key_decision_makers",
  "organizational_context",
  "sales_strategy_notes",
  "open_intelligence_gaps",
  "meeting_demo_prep",
  "research_sources"
];

export const PROSPECT_MEMO_LABELS: Record<keyof ProspectIntelligenceMemo, string> = {
  executive_summary: "Executive Summary",
  what_theyre_looking_for: "What They're Looking For",
  key_decision_makers: "Key Decision Makers",
  organizational_context: "Organizational Context",
  sales_strategy_notes: "Sales Strategy Notes",
  open_intelligence_gaps: "Open Intelligence Gaps",
  meeting_demo_prep: "Meeting / Demo Prep",
  research_sources: "Research Sources"
};

export function emptyProspectMemo(): ProspectIntelligenceMemo {
  return {
    executive_summary: "",
    what_theyre_looking_for: "",
    key_decision_makers: "",
    organizational_context: "",
    sales_strategy_notes: "",
    open_intelligence_gaps: "",
    meeting_demo_prep: "",
    research_sources: ""
  };
}

export function normalizeProspectMemo(raw: unknown): ProspectIntelligenceMemo {
  const e = emptyProspectMemo();
  if (!raw || typeof raw !== "object") return e;
  const o = raw as Record<string, unknown>;
  for (const k of PROSPECT_MEMO_KEYS) {
    const v = o[k];
    e[k] = typeof v === "string" ? v : v != null ? String(v) : "";
  }
  return e;
}
