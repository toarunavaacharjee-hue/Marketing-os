const MAX_CHARS = 48_000;

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // pdf-parse@1.1.1 avoids pdf-parse v2's pdfjs-dist + @napi-rs/canvas stack (broken on Vercel without native canvas).
  const mod = await import("pdf-parse");
  const pdfParse = ((mod as { default?: unknown }).default ?? mod) as (
    data: Buffer
  ) => Promise<{ text?: string }>;
  const result = await pdfParse(buffer);
  return (result?.text ?? "").toString();
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
