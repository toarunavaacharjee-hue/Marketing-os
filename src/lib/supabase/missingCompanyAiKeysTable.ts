/** True when PostgREST reports the BYOK table was never created (run supabase/company_ai_keys.sql). */
export function isMissingCompanyAiKeysTable(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message ?? "").toLowerCase();
  const code = String(err.code ?? "");
  if (code === "PGRST205") return true;
  if (!msg.includes("company_ai_keys")) return false;
  return msg.includes("schema cache") || msg.includes("could not find");
}
