import type { MarketResearchScanResult } from "@/lib/marketResearchTypes";
import { jsPDF } from "jspdf";

function markdownToPlain(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function downloadMarketResearchPdf(opts: {
  productName: string;
  summary: string;
  resultJson: MarketResearchScanResult | null;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;
  let y = 16;

  const addLine = (text: string, fontSize = 10, gap = 5) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
      doc.text(line, margin, y);
      y += gap;
    }
  };

  doc.setFont("helvetica", "bold");
  addLine("Market Research Report", 16, 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  addLine(opts.productName || "Product", 10, 6);
  doc.setTextColor(0);
  y += 4;

  const body = markdownToPlain(opts.summary);
  addLine(body, 10, 5);

  y += 6;
  if (opts.resultJson?.signals?.length) {
    doc.setFont("helvetica", "bold");
    addLine("Top market signals", 12, 7);
    doc.setFont("helvetica", "normal");
    for (const s of opts.resultJson.signals.slice(0, 8)) {
      const block = `• ${s.title}\n${s.description}\n  (${s.source} · ${s.recency})`;
      addLine(block, 9, 4.5);
      y += 2;
    }
  }

  y += 4;
  if (opts.resultJson?.opportunity_map?.length) {
    if (y > 230) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    addLine("Market opportunity map", 12, 7);
    doc.setFont("helvetica", "normal");
    for (const r of opts.resultJson.opportunity_map) {
      const line = `${r.segment} — ${Math.round(r.opportunity_score)}/100 — TAM: ${r.tam_signal} — Competition: ${r.competition}`;
      addLine(line, 9, 5);
    }
  }

  y += 4;
  if (opts.resultJson?.monitoring_sources?.length) {
    if (y > 240) {
      doc.addPage();
      y = 16;
    }
    doc.setFont("helvetica", "bold");
    addLine("Monitoring sources", 12, 7);
    doc.setFont("helvetica", "normal");
    for (const m of opts.resultJson.monitoring_sources) {
      const note = m.note ? `${m.label} — ${m.note}` : m.label;
      addLine(`• ${note} (${m.status})`, 9, 5);
    }
  }

  const safeName = (opts.productName || "report").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 48);
  doc.save(`market-research-${safeName}.pdf`);
}
