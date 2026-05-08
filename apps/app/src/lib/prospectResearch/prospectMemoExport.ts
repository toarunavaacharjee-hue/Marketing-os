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
    const title = [rr[nameIdx >= 0 ? nameIdx : 0], rr[titleIdx >= 0 ? titleIdx : 1]].filter(Boolean).join(" — ").trim() || "Stakeholder";

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
  if (cols >= 6) return docxWideTableAsCards(header, rows);

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
  children.push(...agentSectionParagraphs(ctx));
  return children;
}

export async function prospectMemoToDocxBlob(ctx: ProspectMemoExportContext): Promise<Blob> {
  const doc = new Document({
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

