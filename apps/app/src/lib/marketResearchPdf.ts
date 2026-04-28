import type { MarketResearchScanResult } from "@/lib/marketResearchTypes";
import { jsPDF } from "jspdf";

function markdownToPlain(md: string): string {
  const cleaned = md
    .replace(/\r\n/g, "\n")
    // Preserve headings as plain section titles.
    .replace(/^#{1,6}\s+(.+)$/gm, "\n$1\n")
    // Remove markdown table separators.
    .replace(/^\|?[\s:-]+\|[\s|:-]*$/gm, "")
    // Convert markdown table rows to readable bullets.
    .replace(/^\|\s*\d+\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|?\s*$/gm, "• $1 — $2")
    // Remove obviously truncated trailing table rows like "| 5 | Fr"
    .replace(/^\|\s*\d+\s*\|.*$/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\|\s*/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const lines = cleaned.split("\n");
  while (lines.length) {
    const tail = lines[lines.length - 1].trim();
    // Drop cut-off tail lines that are too short to be meaningful.
    if (tail && tail.length < 8 && !/[.!?)]$/.test(tail)) {
      lines.pop();
      continue;
    }
    break;
  }
  return lines.join("\n").trim();
}

export function downloadMarketResearchPdf(opts: {
  productName: string;
  summary: string;
  resultJson: MarketResearchScanResult | null;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = 14;

  const palette = {
    bg: [12, 14, 20] as const,
    surface: [245, 247, 252] as const,
    border: [210, 217, 232] as const,
    text: [20, 24, 38] as const,
    muted: [88, 97, 122] as const,
    accent: [124, 108, 255] as const,
    green: [52, 211, 153] as const,
    yellow: [251, 191, 36] as const,
    red: [248, 113, 113] as const
  };

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageH - 12) return;
    doc.addPage();
    y = 14;
  };

  const addLine = (
    text: string,
    fontSize = 10,
    gap = 5,
    color: readonly [number, number, number] = palette.text
  ) => {
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      ensureSpace(gap + 1);
      doc.text(line, margin, y);
      y += gap;
    }
  };

  const drawHeader = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(palette.bg[0], palette.bg[1], palette.bg[2]);
    doc.rect(0, 0, pageW, 34, "F");
    doc.setFillColor(palette.accent[0], palette.accent[1], palette.accent[2]);
    doc.roundedRect(margin, 8, 2.5, 18, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    doc.text("Market Research Report", margin + 6, 17);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
    doc.text(opts.productName || "Product", margin + 6, 24);
    doc.text(new Date().toLocaleString(), pageW - margin, 24, { align: "right" });
    y = 42;
  };

  const section = (title: string) => {
    ensureSpace(18);
    doc.setFillColor(palette.surface[0], palette.surface[1], palette.surface[2]);
    doc.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
    doc.roundedRect(margin, y - 6, maxW, 9, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
    doc.text(title, margin + 3, y);
    y += 7;
  };

  const divider = () => {
    ensureSpace(5);
    doc.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  };

  const statusColor = (status: "ok" | "warn" | "err"): readonly [number, number, number] =>
    status === "ok" ? palette.green : status === "warn" ? palette.yellow : palette.red;

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
      doc.line(margin, pageH - 9, pageW - margin, pageH - 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
      doc.text("AI Marketing Workbench", margin, pageH - 5.2);
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 5.2, { align: "right" });
    }
  };

  drawHeader();

  section("Executive Summary");
  doc.setFont("helvetica", "normal");
  addLine(markdownToPlain(opts.summary), 10, 4.7, palette.text);
  divider();

  if (opts.resultJson?.signals?.length) {
    section("Top Market Signals");
    for (const s of opts.resultJson.signals.slice(0, 10)) {
      ensureSpace(17);
      doc.setFillColor(250, 251, 255);
      doc.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
      doc.roundedRect(margin, y - 4, maxW, 13, 1.5, 1.5, "FD");
      doc.setFont("helvetica", "bold");
      addLine(`- ${s.title}`, 10, 4.3, palette.text);
      doc.setFont("helvetica", "normal");
      addLine(s.description, 9, 4.1, palette.muted);
      addLine(`${s.source} | ${s.recency}`, 8.5, 4, palette.accent);
      y += 1.5;
    }
    divider();
  }

  if (opts.resultJson?.opportunity_map?.length) {
    section("Market Opportunity Map");
    ensureSpace(12);
    doc.setFillColor(236, 240, 250);
    doc.rect(margin, y - 4, maxW, 8, "F");
    doc.setFont("helvetica", "bold");
    addLine("Segment", 9, 0, palette.text);
    doc.text("Score", margin + 95, y, { align: "left" });
    doc.text("TAM", margin + 124, y, { align: "left" });
    doc.text("Competition", margin + 152, y, { align: "left" });
    y += 6;
    doc.setFont("helvetica", "normal");
    for (const r of opts.resultJson.opportunity_map) {
      ensureSpace(7);
      doc.setDrawColor(45, 50, 70);
      doc.line(margin, y + 1, pageW - margin, y + 1);
      const seg = doc.splitTextToSize(r.segment, 84);
      doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
      doc.text(seg, margin + 1, y);
      doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
      doc.text(`${Math.round(r.opportunity_score)}/100`, margin + 95, y);
      doc.text(r.tam_signal, margin + 124, y);
      doc.text(r.competition, margin + 152, y);
      y += Math.max(6, seg.length * 4.2);
    }
    y += 2;
    divider();
  }

  if (opts.resultJson?.monitoring_sources?.length) {
    section("Monitoring Sources");
    for (const m of opts.resultJson.monitoring_sources) {
      ensureSpace(8);
      const c = statusColor(m.status);
      doc.setFillColor(c[0], c[1], c[2]);
      doc.circle(margin + 2, y - 1.3, 1.3, "F");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(palette.text[0], palette.text[1], palette.text[2]);
      const note = m.note ? `${m.label} - ${m.note}` : m.label;
      const textLines = doc.splitTextToSize(note, maxW - 12);
      doc.text(textLines, margin + 6, y);
      y += Math.max(5.3, textLines.length * 4.2);
    }
  }

  drawFooter();

  const safeName = (opts.productName || "report").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 48);
  doc.save(`market-research-${safeName}.pdf`);
}
