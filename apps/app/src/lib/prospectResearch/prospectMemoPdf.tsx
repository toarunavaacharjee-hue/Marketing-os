import React from "react";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
  type ProspectIntelligenceMemo,
  PROSPECT_MEMO_KEYS,
  PROSPECT_MEMO_LABELS
} from "@/lib/prospectIntelligenceTypes";
import { type EnrichedStakeholder } from "@/lib/prospectResearch/stakeholderTypes";

export type ProspectMemoPdfContext = {
  memo: ProspectIntelligenceMemo;
  accountName: string;
  companyName?: string;
  websiteUrl?: string;
  dealStage?: string;
  preparedFor?: string;
  demoOrMeetingDate?: string;
  sellerName?: string;
  stakeholders?: EnrichedStakeholder[];
  generatedAtIso?: string;
};

function normalizeMd(md: string): string {
  if (!md.trim()) return "";
  let s = md.replace(/\r\n/g, "\n");
  s = s.replace(/```[\s\S]*?```/g, "\n[code block omitted]\n");
  s = s.replace(/^#{1,6}\s+/gm, "");
  // Emoji / pictographs can render as garbage blocks in many PDF fonts.
  s = s
    .replace(/🔑/g, "Key: ")
    .replace(/🖥️/g, "App: ")
    .replace(/🔍/g, "Research: ");
  // Also strip common “dingbat” symbols (e.g. ⏱) that can render poorly.
  s = s.replace(/[\u2600-\u27BF]/g, "");
  s = s.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

type MdBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "hr" };

function isTableSeparatorLine(line: string): boolean {
  const t = line.trim();
  if (!t.includes("|")) return false;
  return /^[\s|:-]+$/.test(t.replace(/\|/g, ""));
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

function parseMarkdownBlocks(md: string): MdBlock[] {
  const s = normalizeMd(md);
  if (!s) return [{ type: "paragraph", text: "—" }];

  const lines = s.split("\n");
  const blocks: MdBlock[] = [];
  let paraBuf: string[] = [];

  const flushPara = () => {
    const t = paraBuf.join(" ").replace(/\s{2,}/g, " ").trim();
    if (t) blocks.push({ type: "paragraph", text: t });
    paraBuf = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const t = line.trim();

    if (!t) {
      flushPara();
      i++;
      continue;
    }

    if (/^---+$/.test(t)) {
      flushPara();
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // TSV-ish tables (Claude often emits these, which look like "Field<TAB>Detail").
    const nextRaw = lines[i + 1] ?? "";
    const nextTrim = nextRaw.trim();
    if (t.includes("\t") && nextTrim.includes("\t")) {
      flushPara();
      const header = t.split("\t").map((c) => c.trim()).filter(Boolean);
      i++;
      const rows: string[][] = [];
      while (i < lines.length) {
        const rowLine = (lines[i] ?? "").trim();
        if (!rowLine || !rowLine.includes("\t")) break;
        const row = rowLine.split("\t").map((c) => c.trim());
        if (row.some((c) => c.trim().length > 0)) rows.push(row);
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const next = (lines[i + 1] ?? "").trim();
    if (t.includes("|") && isTableSeparatorLine(next)) {
      flushPara();
      const header = parseTableRow(t);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length) {
        const rowLine = (lines[i] ?? "").trim();
        if (!rowLine || !rowLine.includes("|")) break;
        const row = parseTableRow(rowLine);
        if (row.length) rows.push(row);
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    const bulletMatch = t.match(/^([-*+]|•)\s+(.*)$/);
    const numberedMatch = t.match(/^\d+\.\s+(.*)$/);
    if (bulletMatch || numberedMatch) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length) {
        const tt = (lines[i] ?? "").trim();
        const bm = tt.match(/^([-*+]|•)\s+(.*)$/);
        const nm = tt.match(/^\d+\.\s+(.*)$/);
        if (!bm && !nm) break;
        items.push((bm?.[2] ?? nm?.[1] ?? "").trim());
        i++;
      }
      blocks.push({ type: "bullets", items: items.filter(Boolean) });
      continue;
    }

    paraBuf.push(t);
    i++;
  }
  flushPara();
  return blocks.length ? blocks : [{ type: "paragraph", text: "—" }];
}

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function softWrapText(s: string): string {
  const t = (s || "").trim();
  if (!t) return "";
  // Insert zero-width breakpoints so long URLs/emails can wrap.
  return t
    .replace(/([/@._?&=#-])/g, "$1\u200b")
    .replace(/\u200b{2,}/g, "\u200b");
}

function isLikelySubheading(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.length > 90) return false;
  if (/[.!?]$/.test(t)) return false;
  if (/^stakeholder group/i.test(t)) return true;
  if (
    /^(what they'?re looking for|key decision makers|organizational context|sales strategy notes|open intelligence gaps|meeting \/ demo prep|research sources)\b/i.test(
      t
    )
  )
    return true;
  const letters = (t.match(/[A-Za-z]/g) ?? []).length;
  const non = (t.match(/[^A-Za-z0-9\s—–-]/g) ?? []).length;
  return letters >= 6 && non <= 1 && /[A-Za-z]/.test(t);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 42,
    paddingHorizontal: 42,
    fontSize: 10.5,
    color: "#111827",
    fontFamily: "Helvetica"
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 10,
    marginBottom: 14
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12
  },
  title: { fontSize: 16, fontWeight: 700 },
  subtitle: { fontSize: 9, color: "#6B7280" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 6 },
  metaPill: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6
  },
  metaLabel: { fontSize: 8, color: "#6B7280" },
  metaValue: { fontSize: 9.5, color: "#111827", marginTop: 1 },

  section: { marginTop: 12 },
  sectionCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FFFFFF"
  },
  sectionTitle: { fontSize: 11.5, fontWeight: 700, marginBottom: 6, color: "#111827" },
  subTitle: { fontSize: 10.6, fontWeight: 700, marginTop: 10, color: "#111827" },
  body: { fontSize: 10.2, lineHeight: 1.35, color: "#111827" },
  paragraph: { marginTop: 2 },
  bullets: { marginTop: 2 },
  bulletRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  bulletDot: { width: 10, color: "#111827" },
  bulletText: { flex: 1 },

  table: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, overflow: "hidden", marginTop: 6 },
  trHead: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  th: { padding: 6, fontSize: 8.5, fontWeight: 700, color: "#111827" },
  td: { padding: 6, fontSize: 9, color: "#111827" },

  // “SaaS-y” cards for wide tables (stakeholders, agendas, etc.)
  cardsWrap: { marginTop: 6, gap: 8 },
  rowCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 8,
    backgroundColor: "#FFFFFF"
  },
  rowCardTitle: { fontSize: 10.4, fontWeight: 700, color: "#111827" },
  kvGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  kvItem: { width: "50%", paddingRight: 10, marginTop: 4 },
  kvLabel: { fontSize: 8.2, color: "#6B7280" },
  kvValue: { fontSize: 9.2, color: "#111827", marginTop: 1 },

  muted: { color: "#6B7280" }
});

function MetaPill({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{softWrapText(value.trim())}</Text>
    </View>
  );
}

function StakeholderSummary({ stakeholders }: { stakeholders: EnrichedStakeholder[] }) {
  if (!stakeholders.length) return null;
  const rows = stakeholders.slice(0, 12);
  const header = ["Name", "Email", "Title", "Company"];
  const data = rows.map((s) => [
    asStr(s.fullName) || [asStr(s.firstName), asStr(s.lastName)].filter(Boolean).join(" ") || "TBD",
    asStr(s.email) || "—",
    asStr(s.title) || "TBD",
    asStr(s.companyName) || "TBD"
  ]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Attendees (enriched)</Text>
        <MarkdownTable header={header} rows={data} />
      </View>
    </View>
  );
}

function MarkdownTable({ header, rows }: { header: string[]; rows: string[][] }) {
  const cols = Math.max(1, header.length || (rows[0]?.length ?? 1));
  const safeHeader = header.slice(0, cols).map((h) => softWrapText(h));
  const safeRows = rows.map((r) => Array.from({ length: cols }, (_, ci) => softWrapText((r[ci] ?? "").trim() || "—")));

  // 5+ columns is already too cramped for a readable PDF. Convert into “cards”.
  if (cols >= 5) {
    const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
    const labelFor = (i: number) => (safeHeader[i] ?? `Field ${i + 1}`).replace(/\u200b/g, "");
    const nameIdx = safeHeader.findIndex((h) => clean(h).includes("name"));
    const titleIdx = safeHeader.findIndex((h) => clean(h).includes("title"));

    return (
      <View style={styles.cardsWrap}>
        {safeRows.map((r, ri) => {
          const primaryTitle = [r[nameIdx >= 0 ? nameIdx : 0], r[titleIdx >= 0 ? titleIdx : 1]]
            .filter(Boolean)
            .join(" — ")
            .trim();
          return (
            <View key={ri} style={styles.rowCard}>
              <Text style={styles.rowCardTitle}>{primaryTitle || `Row ${ri + 1}`}</Text>
              <View style={styles.kvGrid}>
                {r.map((val, ci) => (
                  <View key={ci} style={styles.kvItem}>
                    <Text style={styles.kvLabel}>{labelFor(ci)}</Text>
                    <Text style={styles.kvValue}>{val || "—"}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
  const weights = safeHeader.slice(0, cols).map((h) => {
    const k = clean(h);
    if (k.includes("role") || k.includes("notes")) return 3.0;
    if (k.includes("linkedin") || k.includes("url")) return 2.0;
    if (k.includes("email")) return 1.9;
    if (k.includes("title")) return 1.8;
    if (k.includes("company")) return 1.8;
    return 1.4;
  });
  const total = weights.reduce((a, b) => a + b, 0) || cols;
  const cellStyleFor = (ci: number) => ({
    width: `${Math.round((weights[ci] / total) * 1000) / 10}%` as const
  });
  const tdStyle = cols >= 5 ? [styles.td, { fontSize: 8.6 }] : [styles.td];
  const thStyle = cols >= 5 ? [styles.th, { fontSize: 8.0 }] : [styles.th];

  return (
    <View style={styles.table}>
      <View style={styles.trHead}>
        {safeHeader.slice(0, cols).map((h, i) => (
          <Text key={i} style={[...thStyle, cellStyleFor(i)]}>
            {h}
          </Text>
        ))}
      </View>
      {safeRows.map((r, ri) => (
        <View key={ri} style={[styles.tr, ...(ri === safeRows.length - 1 ? [{ borderBottomWidth: 0 }] : [])]}>
          {Array.from({ length: cols }, (_, ci) => (
            <Text key={ci} style={[...tdStyle, cellStyleFor(ci)]}>
              {(r[ci] ?? "").trim() || "—"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function MarkdownBlocks({ md }: { md: string }) {
  const blocks = parseMarkdownBlocks(md);
  return (
    <View>
      {blocks.map((b, idx) => {
        if (b.type === "paragraph") {
          const text = softWrapText(b.text);
          if (isLikelySubheading(b.text)) {
            return (
              <Text key={idx} style={styles.subTitle}>
                {text}
              </Text>
            );
          }
          return (
            <Text key={idx} style={[styles.body, styles.paragraph]}>
              {text}
            </Text>
          );
        }
        if (b.type === "hr") {
          return (
            <View
              key={idx}
              style={{
                marginTop: 6,
                marginBottom: 6,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB"
              }}
            />
          );
        }
        if (b.type === "bullets") {
          return (
            <View key={idx} style={styles.bullets}>
              {b.items.map((it, j) => (
                <View key={j} style={styles.bulletRow}>
                  <Text style={[styles.body, styles.bulletDot]}>•</Text>
                  <Text style={[styles.body, styles.bulletText]}>{softWrapText(it)}</Text>
                </View>
              ))}
            </View>
          );
        }
        return <MarkdownTable key={idx} header={b.header} rows={b.rows} />;
      })}
    </View>
  );
}

function ProspectMemoPdfDocument({ ctx }: { ctx: ProspectMemoPdfContext }) {
  const generated = ctx.generatedAtIso ? new Date(ctx.generatedAtIso) : new Date();
  const generatedLabel = Number.isFinite(generated.getTime()) ? generated.toLocaleString() : undefined;
  const memo = ctx.memo;
  const stakeholders = Array.isArray(ctx.stakeholders) ? ctx.stakeholders : [];

  return (
    <Document title={`Prospect Intelligence Memo — ${ctx.accountName}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>PROSPECT INTELLIGENCE MEMO</Text>
            <Text style={styles.subtitle}>{softWrapText(ctx.accountName)}</Text>
          </View>

          <Text style={[styles.subtitle, { marginTop: 4 }]}>
            Prepared: {generatedLabel ?? "—"}
            {ctx.preparedFor?.trim() ? `  |  For: ${ctx.preparedFor.trim()}` : ""}
            {ctx.demoOrMeetingDate?.trim() ? `  |  ${ctx.demoOrMeetingDate.trim()}` : ""}
          </Text>

          <View style={styles.metaGrid}>
            <MetaPill label="Company" value={ctx.companyName} />
            <MetaPill label="Website" value={ctx.websiteUrl} />
            <MetaPill label="Stage" value={ctx.dealStage} />
            <MetaPill label="Seller / AE" value={ctx.sellerName} />
          </View>
        </View>

        <StakeholderSummary stakeholders={stakeholders} />

        {PROSPECT_MEMO_KEYS.map((k) => {
          const raw = memo[k] ?? "";
          return (
            <View key={k} style={styles.section}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{PROSPECT_MEMO_LABELS[k]}</Text>
                <MarkdownBlocks md={raw} />
              </View>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function renderProspectMemoPdf(ctx: ProspectMemoPdfContext): Promise<Buffer> {
  void Font;
  return renderToBuffer(<ProspectMemoPdfDocument ctx={ctx} />);
}

