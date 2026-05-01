/**
 * Prevent open redirects via ?next= — only allow same-origin relative paths.
 */
export function sanitizeAppNextPath(raw: unknown, fallback = "/dashboard"): string {
  if (typeof raw !== "string") return fallback;
  const s = raw.trim();
  if (!s.startsWith("/")) return fallback;
  if (s.includes("//")) return fallback;
  if (s.includes("://")) return fallback;
  if (/[\r\n\\]/.test(s)) return fallback;
  return s || fallback;
}
