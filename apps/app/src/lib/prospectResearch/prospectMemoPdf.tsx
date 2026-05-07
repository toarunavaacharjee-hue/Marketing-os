import React from "react";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer
} from "@react-pdf/renderer";
import { type ProspectIntelligenceMemo, PROSPECT_MEMO_KEYS, PROSPECT_MEMO_LABELS } from "@/lib/prospectIntelligenceTypes";
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

function mdToText(md: string): string {
  if (!md.trim()) return "";
  let s = md.replace(/\r\n/g, "\n");
  s = s.replace(/```[\s\S]*?```/g, "\n[code block omitted]\n");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  s = s.replace(/^\s*[-*+]\s+/gm, "• ");
  s = s.replace(/^\s*\d+\.\s+/gm, "");
  return s.replace(/\n{3,}/g, "\n\n").trim();
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
  sectionTitle: { fontSize: 11.5, fontWeight: 700, marginBottom: 6, color: "#111827" },
  body: { fontSize: 10.2, lineHeight: 1.35, color: "#111827" },

  table: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, overflow: "hidden", marginTop: 6 },
  trHead: { flexDirection: "row", backgroundColor: "#F3F4F6", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  th: { padding: 6, fontSize: 8.5, fontWeight: 700, color: "#111827" },
  td: { padding: 6, fontSize: 9, color: "#111827" },
  colName: { width: "28%" },
  colEmail: { width: "28%" },
  colTitle: { width: "22%" },
  colCompany: { width: "22%" },
  muted: { color: "#6B7280" }
});

function MetaPill({ label, value }: { label: string; value?: string }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value.trim()}</Text>
    </View>
  );
}

function StakeholderTable({ stakeholders }: { stakeholders: EnrichedStakeholder[] }) {
  if (!stakeholders.length) return null;
  const rows = stakeholders.filter((s) => s.email);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Attendees (enriched)</Text>
      <View style={styles.table}>
        <View style={styles.trHead}>
          <Text style={[styles.th, styles.colName]}>Name</Text>
          <Text style={[styles.th, styles.colEmail]}>Email</Text>
          <Text style={[styles.th, styles.colTitle]}>Title</Text>
          <Text style={[styles.th, styles.colCompany]}>Company</Text>
        </View>
        {rows.map((s, idx) => {
          const name =
            s.fullName?.trim() || [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || "TBD";
          const title = s.title?.trim() || "TBD";
          const company = s.companyName?.trim() || "TBD";
          const dim = s.matchStatus !== "matched";
          return (
            <View key={`${s.email}-${idx}`} style={[styles.tr, idx === rows.length - 1 ? { borderBottomWidth: 0 } : null]}>
              <Text style={[styles.td, styles.colName, dim ? styles.muted : null]}>{name}</Text>
              <Text style={[styles.td, styles.colEmail, dim ? styles.muted : null]}>{s.email}</Text>
              <Text style={[styles.td, styles.colTitle, dim ? styles.muted : null]}>{title}</Text>
              <Text style={[styles.td, styles.colCompany, dim ? styles.muted : null]}>{company}</Text>
            </View>
          );
        })}
      </View>
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
            <Text style={styles.subtitle}>{ctx.accountName}</Text>
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

        <StakeholderTable stakeholders={stakeholders} />

        {PROSPECT_MEMO_KEYS.map((k) => {
          const raw = memo[k] ?? "";
          const text = mdToText(raw);
          return (
            <View key={k} style={styles.section}>
              <Text style={styles.sectionTitle}>{PROSPECT_MEMO_LABELS[k]}</Text>
              <Text style={styles.body}>{text || "—"}</Text>
            </View>
          );
        })}
      </Page>
    </Document>
  );
}

export async function renderProspectMemoPdf(ctx: ProspectMemoPdfContext): Promise<Buffer> {
  // Font.register is optional; Helvetica is built-in. Keep as-is for reliability.
  void Font;
  return renderToBuffer(<ProspectMemoPdfDocument ctx={ctx} />);
}

