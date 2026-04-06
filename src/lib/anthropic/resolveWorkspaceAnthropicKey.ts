import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getCompanyPlan, getSelectedCompanyId } from "@/lib/companyContext";
import { decryptWorkspaceSecret } from "@/lib/crypto/workspaceKeyCrypto";
import { planEligibleForPlatformAnthropicDefault } from "@/lib/planEntitlements";
import { isMissingCompanyAiKeysTable } from "@/lib/supabase/missingCompanyAiKeysTable";

export type ResolveAnthropicKeyResult =
  | { ok: true; key: string }
  | { ok: false; error: string; status: number };

function operatorAnthropicKey(): string {
  return (process.env.ANTHROPIC_API_KEY || "").trim();
}

/**
 * Anthropic API key for the **selected workspace**:
 * 1) Workspace BYOK (company_ai_keys, encrypted) when present — any plan.
 * 2) Else starter/free/growth only: ANTHROPIC_API_KEY (operator / platform default).
 * Enterprise must add a workspace key (BYOK).
 */
export async function resolveWorkspaceAnthropicKey(): Promise<ResolveAnthropicKeyResult> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated.", status: 401 };
  }

  const companyId = await getSelectedCompanyId();
  if (!companyId) {
    return { ok: false, error: "No workspace selected.", status: 400 };
  }

  const { data: mem, error: memErr } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr) {
    return { ok: false, error: memErr.message, status: 500 };
  }
  if (!mem) {
    return { ok: false, error: "Not a member of this workspace.", status: 403 };
  }

  const plan = await getCompanyPlan(companyId);
  const platformKey = operatorAnthropicKey();
  const allowPlatform = planEligibleForPlatformAnthropicDefault(plan);

  const svc = createSupabaseServiceRoleClient();
  if (!svc) {
    if (allowPlatform && platformKey) {
      return { ok: true, key: platformKey };
    }
    return {
      ok: false,
      error:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY. It is required to load workspace AI keys securely.",
      status: 500
    };
  }

  const { data: row, error } = await svc
    .from("company_ai_keys")
    .select("ciphertext")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error && !isMissingCompanyAiKeysTable(error)) {
    return { ok: false, error: error.message, status: 500 };
  }

  if (row?.ciphertext) {
    try {
      const key = decryptWorkspaceSecret(row.ciphertext as string).trim();
      if (!key) {
        return { ok: false, error: "Stored workspace key is invalid.", status: 500 };
      }
      return { ok: true, key };
    } catch {
      return {
        ok: false,
        error:
          "Could not decrypt workspace AI key. Set WORKSPACE_AI_KEY_ENCRYPTION_SECRET to the same value used when the key was saved.",
        status: 500
      };
    }
  }

  if (allowPlatform && platformKey) {
    return { ok: true, key: platformKey };
  }

  if (allowPlatform && !platformKey) {
    return {
      ok: false,
      error:
        "No Anthropic access for this workspace yet. Your operator can set ANTHROPIC_API_KEY for Starter, Free, and Growth workspaces, or a workspace admin can add a key under Settings → AI integration.",
      status: 400
    };
  }

  return {
    ok: false,
    error:
      "This workspace needs its own Anthropic API key. A workspace owner or admin can add one under Settings → AI integration (required on Enterprise).",
    status: 400
  };
}

export async function isWorkspaceAdminForSelectedCompany(): Promise<{
  ok: true;
  companyId: string;
} | { ok: false; error: string; status: number }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not authenticated.", status: 401 };
  }
  const companyId = await getSelectedCompanyId();
  if (!companyId) {
    return { ok: false, error: "No workspace selected.", status: 400 };
  }
  const { data: mem, error: memErr } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr) {
    return { ok: false, error: memErr.message, status: 500 };
  }
  const role = String((mem as { role?: string } | null)?.role ?? "").toLowerCase();
  if (!mem || (role !== "owner" && role !== "admin")) {
    return { ok: false, error: "Only workspace owners and admins can manage the AI API key.", status: 403 };
  }
  return { ok: true, companyId };
}
