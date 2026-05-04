import fs from "node:fs";
import path from "node:path";

/**
 * Markdown source for `/dashboard/help`.
 * Deployed builds read `apps/app/content/user-guide.md` (cwd = apps/app).
 * Dev fallback: repo root `docs/USER_GUIDE.md`.
 */
export function loadUserGuideMarkdown(): string {
  const candidates = [
    path.join(process.cwd(), "content", "user-guide.md"),
    path.join(process.cwd(), "..", "..", "docs", "USER_GUIDE.md")
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    } catch {
      /* ignore */
    }
  }
  return `# Help\n\nDocumentation could not be loaded. Try again later or contact support.\n`;
}
