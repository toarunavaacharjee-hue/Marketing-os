import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
import { jsPDF } from "jspdf";
import {
  PROSPECT_MEMO_KEYS,
  PROSPECT_MEMO_LABELS,
  type ProspectIntelligenceMemo
} from "@/lib/prospectIntelligenceTypes";

export type ProspectMemoExportContext = {
  memo: ProspectIntelligenceMemo;
  /** Account / opportunity name */
  accountName: string;
  companyName?: string;
  websiteUrl?: string;
  dealStage?: string;
  preparedFor?: string;
  demoOrMeetingDate?: string;
  sellerName?: string;
  /** Optional public autofill fields */
  publicInfo?: {
    industrySubvertical?: string;
    companySize?: string;
    geography?: string;
    businessModel?: string;
    techStack?: string;
    fundingOwnership?: string;
    recentNewsEvents?: string;
  };
  /** Pasted notes / uploads context from the form */
  additionalContext?: string;
  /** Optional last Q&A from Prospect agent */
  lastAgentQ?: string;
  lastAgentA?: string;
};

/** Safe file basename (ASCII-ish). */
export function sanitizeProspectFilename(name: string, ext: string): string {
  const base = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80);
  const safe = base.length ? base : "Prospect_Intelligence_Memo";
  return `${safe}.${ext.replace(/^\./, "")}`;
}

/** Light markdown → plain text for exports (tables become line-oriented text). */
export function markdownToPlainText(md: string): string {
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
  const lines = s.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t.includes("|") && /^[\s|:-]+$/.test(t.replace(/\|/g, ""))) continue;
    if (t.includes("|")) {
      const cells = t
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cells.length > 1) out.push(cells.join("\t"));
      else out.push(line);
    } else {
      out.push(line);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

type DocxBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "hr" };

type StageBucket = "intro" | "evaluation" | "pov" | "procurement" | "close" | "unknown";

function stageBucketFromDealStage(dealStageRaw?: string): StageBucket {
  const s = (dealStageRaw || "").toLowerCase().trim();
  if (!s || s === "tbd" || s === "unknown") return "unknown";
  if (/(intro|first|discovery|qualif)/.test(s)) return "intro";
  if (/(evaluat|compare|shortlist|consider)/.test(s)) return "evaluation";
  if (/(pilot|pov|proof|trial|technical validation)/.test(s)) return "pov";
  if (/(procure|security|legal|msa|dpa|so?c ?2|infosec)/.test(s)) return "procurement";
  if (/(close|sign|contract|final|implementation|kickoff)/.test(s)) return "close";
  return "unknown";
}

function nextStepsMarkdown(ctx: ProspectMemoExportContext): string {
  const bucket = stageBucketFromDealStage(ctx.dealStage);
  const account = (ctx.accountName || "the account").trim();
  const stageLabel =
    bucket === "intro"
      ? "Stage 1 — Intro / First meeting (Discovery)"
      : bucket === "evaluation"
        ? "Stage 2 — Active evaluation (Comparing options)"
        : bucket === "pov"
          ? "Stage 3 — Solution validation (Pilot / POV)"
          : bucket === "procurement"
            ? "Stage 4 — Procurement / Security (Commercial + legal gates)"
            : bucket === "close"
              ? "Stage 5 — Close / Implementation planning"
              : "Stage — Unknown / TBD";

  const recommended =
    bucket === "unknown"
      ? `Recommended focus for ${account}: confirm evaluation stage + decision process, then pick the right next step from the playbook below.`
      : `Recommended focus for ${account}: ${stageLabel}.`;

  return [
    recommended,
    "---",
    "Stage 1 — Intro / First meeting (Discovery)",
    "- Objective: confirm problem, stakeholders, and success metrics.",
    "- Next steps: schedule a 60‑min deep-dive discovery; confirm decision process + timeline; identify evaluation criteria.",
    "- Communication: recap email within 2 hours + calendar invite.",
    "",
    "Stage 2 — Active evaluation (Comparing options)",
    "- Objective: prove fit + create a champion.",
    "- Next steps: tailored demo/workshop; technical validation session (integration + security model); share a 1‑page business case draft.",
    "- Communication: email + shared doc; short Slack/Teams note if appropriate.",
    "",
    "Stage 3 — Solution validation (Pilot / POV)",
    "- Objective: de-risk adoption and quantify value.",
    "- Next steps: define a 2–4 week POV plan (scope, success metrics, owners, timeline); confirm integrations + data access; agree a go/no-go date.",
    "- Communication: working session + POV plan in writing.",
    "",
    "Stage 4 — Procurement / Security (Commercial + legal gates)",
    "- Objective: remove friction and keep momentum.",
    "- Next steps: send security pack (SOC2, DPA, subprocessors, architecture); align on terms; confirm legal workflow + signature target date.",
    "- Communication: checklist-driven email + 15‑min procurement alignment call.",
    "",
    "Stage 5 — Close / Implementation planning",
    "- Objective: operationalize the decision.",
    "- Next steps: kickoff plan (timeline, admins, training); define 30/60/90‑day success checkpoints; set exec sponsor cadence.",
    "- Communication: kickoff invite + implementation plan doc; weekly updates.",
    "",
    "Follow-up email template (copy/paste)",
    "- Subject: Next steps for " + account,
    "- 1) What we heard (top 3 priorities)",
    "- 2) Decisions made today",
    "- 3) Risks / blockers (and who owns each)",
    "- 4) Next step (with owner + date/time)",
    "- 5) Open questions (3 max)"
  ].join("\n");
}

function normalizeMd(md: string): string {
  if (!md.trim()) return "";
  let s = md.replace(/\r\n/g, "\n");
  s = s.replace(/```[\s\S]*?```/g, "\n[code block omitted]\n");
  s = s.replace(/^#{1,6}\s+/gm, "");
  // Emoji / pictographs often don’t render correctly in DOCX exports.
  s = s
    .replace(/🔑/g, "Key: ")
    .replace(/🖥️/g, "App: ")
    .replace(/🔍/g, "Research: ");
  // Strip “dingbat” symbols too (e.g. ⏱) to avoid font glitches.
  s = s.replace(/[\u2600-\u27BF]/g, "");
  s = s.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

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

function parseDocxBlocks(md: string): DocxBlock[] {
  const s = normalizeMd(md);
  if (!s) return [{ type: "paragraph", text: "—" }];
  const lines = s.split("\n");
  const blocks: DocxBlock[] = [];
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

    // TSV-like tables (Claude often emits these).
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

    // Pipe tables.
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

    // Bullets.
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

function docxHr(): Paragraph {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" }
    },
    spacing: { after: 120, before: 120 }
  });
}

function docxWideTableAsCards(header: string[], rows: string[][]): Table {
  const cols = Math.max(1, header.length || (rows[0]?.length ?? 1));
  const headerClean = header.slice(0, cols).map((h) => (h || "").trim());
  const clean = (s: string) => (s || "").toLowerCase().replace(/[^a-z]/g, "");
  const nameIdx = headerClean.findIndex((h) => clean(h).includes("name"));
  const titleIdx = headerClean.findIndex((h) => clean(h).includes("title"));

  const cardRows: TableRow[] = [];
  for (const r of rows) {
    const rr = Array.from({ length: cols }, (_, i) => (r[i] ?? "").trim());
    const title =
      [rr[nameIdx >= 0 ? nameIdx : 0], rr[titleIdx >= 0 ? titleIdx : 1]].filter(Boolean).join(" — ").trim() ||
      "Stakeholder";

    // Header row.
    cardRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            shading: { type: ShadingType.SOLID, color: "EEF2FF" },
            children: [new Paragraph({ children: [new TextRun({ text: title, bold: true })] })]
          })
        ]
      })
    );

    // Key/value rows (2 columns).
    for (let i = 0; i < cols; i++) {
      const k = headerClean[i] || `Field ${i + 1}`;
      const v = rr[i] || "—";
      cardRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.SOLID, color: "F9FAFB" },
              children: [new Paragraph({ children: [new TextRun({ text: k, bold: true })] })]
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: v })]
            })
          ]
        })
      );
    }

    // Spacer row.
    cardRows.push(
      new TableRow({
        children: [new TableCell({ columnSpan: 2, children: [new Paragraph({ text: " " })] })]
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: cardRows
  });
}

function docxTable(header: string[], rows: string[][]): Table {
  const cols = Math.max(1, header.length || (rows[0]?.length ?? 1));
  // Wide tables are what makes the DOCX feel “intern pasted a spreadsheet”.
  if (cols >= 5) return docxWideTableAsCards(header, rows);

  const colW = Math.floor(100 / cols);
  const cell = (text: string, opts?: { header?: boolean }) =>
    new TableCell({
      width: { size: colW, type: WidthType.PERCENTAGE },
      shading: opts?.header ? { type: ShadingType.SOLID, color: "F3F4F6" } : undefined,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: (text || "—").trim() || "—",
              bold: !!opts?.header
            })
          ]
        })
      ]
    });

  const head = new TableRow({
    children: Array.from({ length: cols }, (_, i) => cell(header[i] ?? "", { header: true }))
  });
  const body = rows.map(
    (r) =>
      new TableRow({
        children: Array.from({ length: cols }, (_, i) => cell(r[i] ?? ""))
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [head, ...body]
  });
}

function pushMetaParagraphs(children: Paragraph[], ctx: ProspectMemoExportContext): void {
  const rows: Array<[string, string]> = [
    ["Account / opportunity", ctx.accountName.trim()],
    ["Company", ctx.companyName?.trim() ?? ""],
    ["Website", ctx.websiteUrl?.trim() ?? ""],
    ["Deal stage", ctx.dealStage?.trim() ?? ""],
    ["Prepared for", ctx.preparedFor?.trim() ?? ""],
    ["Demo / meeting", ctx.demoOrMeetingDate?.trim() ?? ""],
    ["Seller / AE", ctx.sellerName?.trim() ?? ""]
  ];
  for (const [label, val] of rows) {
    if (!val) continue;
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: val })]
      })
    );
  }
  const p = ctx.publicInfo;
  if (p) {
    const pub: Array<[string, string]> = [
      ["Industry (sub-vertical)", p.industrySubvertical?.trim() ?? ""],
      ["Company size", p.companySize?.trim() ?? ""],
      ["Geography", p.geography?.trim() ?? ""],
      ["Business model", p.businessModel?.trim() ?? ""],
      ["Tech stack", p.techStack?.trim() ?? ""],
      ["Funding/ownership", p.fundingOwnership?.trim() ?? ""],
      ["Recent news/events", p.recentNewsEvents?.trim() ?? ""]
    ];
    const any = pub.some(([, v]) => v.length > 0);
    if (any) {
      children.push(new Paragraph({ text: "Public info (autofill)", heading: HeadingLevel.HEADING_2 }));
      for (const [label, val] of pub) {
        if (!val) continue;
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun({ text: val })]
          })
        );
      }
    }
  }
}

function additionalContextParagraphs(ctx: ProspectMemoExportContext): Paragraph[] {
  const raw = ctx.additionalContext?.trim();
  if (!raw) return [];
  const plain = markdownToPlainText(raw);
  const children: Paragraph[] = [
    new Paragraph({
      text: "Additional context (seller)",
      heading: HeadingLevel.HEADING_2
    })
  ];
  for (const block of plain.split(/\n{2,}/)) {
    for (const line of block.split("\n")) {
      children.push(new Paragraph({ text: line || " " }));
    }
  }
  return children;
}

function memoSectionChildren(memo: ProspectIntelligenceMemo): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [];
  for (const key of PROSPECT_MEMO_KEYS) {
    const body = memo[key]?.trim();
    children.push(new Paragraph({ text: PROSPECT_MEMO_LABELS[key], heading: HeadingLevel.HEADING_2 }));
    if (!body) {
      children.push(new Paragraph({ text: "—" }));
      continue;
    }

    const blocks = parseDocxBlocks(body);
    for (const b of blocks) {
      if (b.type === "paragraph") children.push(new Paragraph({ text: b.text || " " }));
      else if (b.type === "hr") children.push(docxHr());
      else if (b.type === "bullets") {
        for (const it of b.items) children.push(new Paragraph({ text: it || " ", bullet: { level: 0 } }));
      } else if (b.type === "table") children.push(docxTable(b.header, b.rows));
    }
  }
  return children;
}

function agentSectionParagraphs(ctx: ProspectMemoExportContext): Paragraph[] {
  const q = ctx.lastAgentQ?.trim();
  const a = ctx.lastAgentA?.trim();
  if (!q && !a) return [];
  const children: Paragraph[] = [
    new Paragraph({
      text: "Prospect agent (last Q&A)",
      heading: HeadingLevel.HEADING_1
    })
  ];
  if (q) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Question: ", bold: true }), new TextRun({ text: q })]
      })
    );
  }
  if (a) {
    const plain = markdownToPlainText(a);
    children.push(new Paragraph({ children: [new TextRun({ text: "Answer: ", bold: true })] }));
    for (const block of plain.split(/\n{2,}/)) {
      for (const line of block.split("\n")) {
        children.push(new Paragraph({ text: line || " " }));
      }
    }
  }
  return children;
}

function buildDocumentChildren(ctx: ProspectMemoExportContext): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [];
  children.push(new Paragraph({ text: "Prospect Intelligence Memo", heading: HeadingLevel.TITLE }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}` })] }));
  children.push(new Paragraph({ text: "" }));
  pushMetaParagraphs(children as Paragraph[], ctx);
  children.push(new Paragraph({ text: "" }));
  children.push(...additionalContextParagraphs(ctx));
  if (ctx.additionalContext?.trim()) children.push(new Paragraph({ text: "" }));
  children.push(new Paragraph({ text: "Memo sections", heading: HeadingLevel.HEADING_1 }));
  children.push(...memoSectionChildren(ctx.memo));
  children.push(new Paragraph({ text: "Recommended Next Steps (by stage)", heading: HeadingLevel.HEADING_1 }));
  for (const b of parseDocxBlocks(nextStepsMarkdown(ctx))) {
    if (b.type === "paragraph") children.push(new Paragraph({ text: b.text || " " }));
    else if (b.type === "hr") children.push(docxHr());
    else if (b.type === "bullets") {
      for (const it of b.items) children.push(new Paragraph({ text: it || " ", bullet: { level: 0 } }));
    } else if (b.type === "table") children.push(docxTable(b.header, b.rows));
  }
  children.push(...agentSectionParagraphs(ctx));
  return children;
}

export async function prospectMemoToDocxBlob(ctx: ProspectMemoExportContext): Promise<Blob> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: "111827" }, // 11pt
          paragraph: { spacing: { line: 276, after: 120 } } // ~1.15 line spacing, 6pt after
        }
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Calibri", size: 36, bold: true, color: "111827" }, // 18pt
          paragraph: { spacing: { after: 240 } }
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Calibri", size: 28, bold: true, color: "111827" }, // 14pt
          paragraph: { spacing: { before: 260, after: 120 } }
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Calibri", size: 24, bold: true, color: "111827" }, // 12pt
          paragraph: { spacing: { before: 220, after: 100 } }
        }
      ]
    },
    sections: [
      {
        properties: {},
        children: buildDocumentChildren(ctx)
      }
    ]
  });
  return Packer.toBlob(doc);
}

export function prospectMemoToPdfBlob(ctx: ProspectMemoExportContext): Blob {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageW = pdf.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  let y = margin;
  const lineH = 14;
  const titleSize = 16;
  const bodySize = 10;

  const ensureSpace = (needed: number) => {
    const pageH = pdf.internal.pageSize.getHeight();
    if (y + needed > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const addLine = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? bodySize;
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxW);
    ensureSpace(lines.length * lineH + 4);
    pdf.text(lines, margin, y);
    y += lines.length * lineH + 4;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(titleSize);
  addLine("Prospect Intelligence Memo", { bold: true, size: titleSize });
  pdf.setFontSize(bodySize);
  pdf.setFont("helvetica", "normal");
  addLine(`Generated: ${new Date().toLocaleString()}`);

  const metaRows: Array<[string, string]> = [
    ["Account / opportunity", ctx.accountName.trim()],
    ["Company", ctx.companyName?.trim() ?? ""],
    ["Website", ctx.websiteUrl?.trim() ?? ""],
    ["Deal stage", ctx.dealStage?.trim() ?? ""],
    ["Prepared for", ctx.preparedFor?.trim() ?? ""],
    ["Demo / meeting", ctx.demoOrMeetingDate?.trim() ?? ""],
    ["Seller / AE", ctx.sellerName?.trim() ?? ""]
  ];
  for (const [k, v] of metaRows) {
    if (!v) continue;
    addLine(`${k}: ${v}`);
  }

  const p = ctx.publicInfo;
  if (p) {
    const pub: Array<[string, string]> = [
      ["Industry (sub-vertical)", p.industrySubvertical?.trim() ?? ""],
      ["Company size", p.companySize?.trim() ?? ""],
      ["Geography", p.geography?.trim() ?? ""],
      ["Business model", p.businessModel?.trim() ?? ""],
      ["Tech stack", p.techStack?.trim() ?? ""],
      ["Funding/ownership", p.fundingOwnership?.trim() ?? ""],
      ["Recent news/events", p.recentNewsEvents?.trim() ?? ""]
    ];
    if (pub.some(([, v]) => v.length > 0)) {
      addLine("Public info (autofill)", { bold: true, size: 12 });
      for (const [k, v] of pub) {
        if (v) addLine(`${k}: ${v}`);
      }
    }
  }

  const addCtx = ctx.additionalContext?.trim();
  if (addCtx) {
    y += 8;
    addLine("Additional context (seller)", { bold: true, size: 12 });
    addLine(markdownToPlainText(addCtx));
  }

  y += 8;
  addLine("Memo sections", { bold: true, size: 12 });

  for (const key of PROSPECT_MEMO_KEYS) {
    const body = ctx.memo[key]?.trim();
    addLine(PROSPECT_MEMO_LABELS[key], { bold: true, size: 11 });
    if (!body) {
      addLine("—");
      continue;
    }
    const plain = markdownToPlainText(body);
    for (const para of plain.split(/\n{2,}/)) {
      addLine(para);
    }
    y += 4;
    ensureSpace(0);
  }

  const q = ctx.lastAgentQ?.trim();
  const a = ctx.lastAgentA?.trim();
  if (q || a) {
    y += 8;
    addLine("Prospect agent (last Q&A)", { bold: true, size: 12 });
    if (q) addLine(`Question: ${q}`);
    if (a) {
      addLine("Answer:");
      addLine(markdownToPlainText(a));
    }
  }

  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

