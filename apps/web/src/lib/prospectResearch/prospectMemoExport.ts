import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
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
        children: [
          new TextRun({ text: `${label}: `, bold: true }),
          new TextRun({ text: val })
        ]
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
      children.push(
        new Paragraph({
          text: "Public info (autofill)",
          heading: HeadingLevel.HEADING_2
        })
      );
      for (const [label, val] of pub) {
        if (!val) continue;
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true }),
              new TextRun({ text: val })
            ]
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

function memoSectionParagraphs(memo: ProspectIntelligenceMemo): Paragraph[] {
  const children: Paragraph[] = [];
  for (const key of PROSPECT_MEMO_KEYS) {
    const body = memo[key]?.trim();
    children.push(
      new Paragraph({
        text: PROSPECT_MEMO_LABELS[key],
        heading: HeadingLevel.HEADING_2
      })
    );
    if (!body) {
      children.push(new Paragraph({ text: "—" }));
      continue;
    }
    const plain = markdownToPlainText(body);
    for (const block of plain.split(/\n{2,}/)) {
      const lines = block.split("\n").map((l) => l.trimEnd());
      for (const line of lines) {
        children.push(new Paragraph({ text: line || " " }));
      }
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

function buildDocumentChildren(ctx: ProspectMemoExportContext): Paragraph[] {
  const children: Paragraph[] = [];
  children.push(
    new Paragraph({
      text: "Prospect Intelligence Memo",
      heading: HeadingLevel.TITLE
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: `Generated: ${new Date().toLocaleString()}` })]
    })
  );
  children.push(new Paragraph({ text: "" }));
  pushMetaParagraphs(children, ctx);
  children.push(new Paragraph({ text: "" }));
  children.push(...additionalContextParagraphs(ctx));
  if (ctx.additionalContext?.trim()) {
    children.push(new Paragraph({ text: "" }));
  }
  children.push(
    new Paragraph({
      text: "Memo sections",
      heading: HeadingLevel.HEADING_1
    })
  );
  children.push(...memoSectionParagraphs(ctx.memo));
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
