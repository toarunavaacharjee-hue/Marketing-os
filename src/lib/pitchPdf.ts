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

export function downloadPitchPdf(opts: {
  productName: string;
  personaName: string;
  competitorName: string;
  pitchMarkdown: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = 14;

  const palette = {
    headerBg: [12, 14, 20] as const,
    border: [210, 217, 232] as const,
    text: [20, 24, 38] as const,
    muted: [88, 97, 122] as const,
    accent: [124, 108, 255] as const,
    surface: [245, 247, 252] as const
  };

  const ensureSpace = (needed: number) => {
    if (y + needed <= pageH - 12) return;
    doc.addPage();
    y = 14;
  };

  const addLine = (
    text: string,
    fontSize = 10,
    gap = 4.8,
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

    doc.setFillColor(palette.headerBg[0], palette.headerBg[1], palette.headerBg[2]);
    doc.rect(0, 0, pageW, 34, "F");

    doc.setFillColor(palette.accent[0], palette.accent[1], palette.accent[2]);
    doc.roundedRect(margin, 8, 2.5, 18, 1, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("Pitch Battlecard", margin + 6, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(220, 225, 240);
    doc.text(opts.productName || "Product", margin + 6, 24);
    doc.text(new Date().toLocaleString(), pageW - margin, 24, { align: "right" });

    y = 42;
  };

  const metaChip = (label: string, value: string) => {
    ensureSpace(9);
    doc.setFillColor(palette.surface[0], palette.surface[1], palette.surface[2]);
    doc.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
    doc.roundedRect(margin, y - 5, maxW, 9, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    addLine(label, 9.5, 0, palette.muted);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 42, y, { align: "left" });
    y += 6.5;
  };

  const section = (title: string) => {
    ensureSpace(14);
    doc.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFont("helvetica", "bold");
    addLine(title, 12, 5.6, palette.text);
    doc.setFont("helvetica", "normal");
  };

  const drawFooter = () => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(palette.border[0], palette.border[1], palette.border[2]);
      doc.line(margin, pageH - 9, pageW - margin, pageH - 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(palette.muted[0], palette.muted[1], palette.muted[2]);
      doc.text("Marketing OS", margin, pageH - 5.2);
      doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 5.2, { align: "right" });
    }
  };

  drawHeader();
  metaChip("Customer", opts.personaName || "—");
  metaChip("Competitor", opts.competitorName || "—");

  section("Pitch");
  addLine(markdownToPlain(opts.pitchMarkdown), 10, 4.7, palette.text);

  drawFooter();

  const safe = (s: string) => s.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 42);
  doc.save(`pitch-battlecard-${safe(opts.personaName || "customer")}-vs-${safe(opts.competitorName || "competitor")}.pdf`);
}

