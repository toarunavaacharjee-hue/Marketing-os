/** First balanced `{ ... }` respecting JSON strings (avoids broken first/last-brace slicing). */
export function extractFirstJsonObjectString(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function stripCodeFences(raw: string) {
  const mJson = raw.match(/```json\s*([\s\S]*?)```/i);
  if (mJson?.[1]) return mJson[1].trim();
  const m = raw.match(/```\s*([\s\S]*?)```/);
  return m?.[1]?.trim() ?? raw;
}

export function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = stripCodeFences(text);
  const blob = extractFirstJsonObjectString(cleaned) ?? extractFirstJsonObjectString(text);
  if (!blob) return null;
  try {
    return JSON.parse(blob) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Same as parseJsonObject, plus common AI JSON slip-ups (trailing commas, curly quotes). */
export function parseJsonObjectLenient(text: string): Record<string, unknown> | null {
  const direct = parseJsonObject(text);
  if (direct) return direct;
  const cleaned = stripCodeFences(text).trim();
  const normalized = cleaned
    .replace(/[\u201c\u201d\u2018\u2019]/g, '"')
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
  return parseJsonObject(normalized);
}
