export type AttendeeEnrichmentInput = {
  fullName?: string;
  email?: string;
  title?: string;
  companyName?: string;
  companyDomain?: string;
  linkedinUrl?: string;
};

export type EnrichedStakeholder = {
  /** Input email if available (may be personal or work). */
  email?: string;
  /** Provider that returned this record. */
  source: "google" | "manual";
  /** If provider matched a person record. */
  matchStatus: "matched" | "not_found" | "error";
  /** Confidence / match score if available. */
  matchScore?: number;

  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  seniority?: string;
  department?: string;

  companyName?: string;
  companyDomain?: string;

  linkedinUrl?: string;
  location?: string;

  /** Optional notes or raw provider error. */
  note?: string;
};

export function normalizeEmailList(raw: string): string[] {
  return raw
    .split(/[\s,;]+/g)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export function stakeholdersToMarkdown(stakeholders: EnrichedStakeholder[]): string {
  if (!stakeholders.length) return "";

  const rows = stakeholders.map((s) => {
    const name = s.fullName?.trim() || [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || "TBD";
    const title = s.title?.trim() || "TBD";
    const company = s.companyName?.trim() || "TBD";
    const domain = s.companyDomain?.trim() || "";
    const li = s.linkedinUrl?.trim() || "";
    const status = s.matchStatus === "matched" ? "Matched" : s.matchStatus === "not_found" ? "Not found" : "Error";
    const extra = [domain, li ? `LinkedIn: ${li}` : "", s.location ? `Loc: ${s.location}` : ""]
      .filter(Boolean)
      .join(" · ");

    return `| ${name} | ${s.email?.trim() || "—"} | ${title} | ${company} | ${status}${extra ? ` — ${extra}` : ""} |`;
  });

  return [
    "### Attendee enrichment (AI)",
    "",
    "| Name | Email | Title | Company | Notes |",
    "| --- | --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

