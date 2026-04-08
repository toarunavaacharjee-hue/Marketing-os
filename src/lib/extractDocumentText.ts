const MAX_CHARS = 48_000;

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // Use pdf.js text extraction (no rendering) to avoid canvas/DOM polyfills in serverless.
  // pdfjs-dist is pulled in as a dependency of pdf-parse.
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as any;
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items: Array<{ str?: string }> = Array.isArray(content?.items) ? content.items : [];
    const pageText = items
      .map((it) => it.str ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) parts.push(pageText);
  }
  try {
    await doc.destroy?.();
  } catch {
    // ignore
  }
  return parts.join("\n\n");
}

export async function extractTextFromBuffer(buffer: Buffer, filename: string): Promise<string> {
  const lower = filename.toLowerCase();
  let text = "";

  if (lower.endsWith(".pdf")) {
    text = await extractTextFromPdfBuffer(buffer);
  } else if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const res = await mammoth.extractRawText({ buffer });
    text = res.value ?? "";
  } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [];
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      if (sheet) parts.push(`Sheet: ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`);
    }
    text = parts.join("\n\n");
  } else {
    throw new Error("Unsupported format. Use PDF, Word (.docx), or Excel (.xlsx / .xls / .csv).");
  }

  text = text.replace(/\u0000/g, "").trim();
  if (text.length > MAX_CHARS) {
    text = `${text.slice(0, MAX_CHARS)}\n\n[truncated for AI processing]`;
  }
  return text;
}

