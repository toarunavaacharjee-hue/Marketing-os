import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getCompanyPlan, getSelectedCompanyId } from "@/lib/companyContext";
import { planEligibleForPlatformAnthropicDefault } from "@/lib/planEntitlements";
import { encryptWorkspaceSecret } from "@/lib/crypto/workspaceKeyCrypto";
import { isWorkspaceAdminForSelectedCompany } from "@/lib/anthropic/resolveWorkspaceAnthropicKey";
import { isMissingCompanyAiKeysTable } from "@/lib/supabase/missingCompanyAiKeysTable";

async function assertMember(): Promise<
  | { ok: false; res: NextResponse }
  | { ok: true; companyId: string; canManage: boolean }
> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, res: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  }
  const companyId = await getSelectedCompanyId();
  if (!companyId) {
    return { ok: false, res: NextResponse.json({ error: "No workspace selected." }, { status: 400 }) };
  }
  const { data: mem, error: memErr } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memErr) {
    return { ok: false, res: NextResponse.json({ error: memErr.message }, { status: 500 }) };
  }
  if (!mem) {
    return {
      ok: false,
      res: NextResponse.json({ error: "Not a member of this workspace." }, { status: 403 })
    };
  }
  const role = String((mem as { role?: string }).role ?? "").toLowerCase();
  const canManage = role === "owner" || role === "admin";
  return { ok: true, companyId, canManage };
}

export async function GET() {
  const gate = await assertMember();
  if (!gate.ok) return gate.res;
  const { companyId, canManage } = gate;

  const plan = await getCompanyPlan(companyId);
  const platformEligible = planEligibleForPlatformAnthropicDefault(plan);
  const platformKeySet = Boolean((process.env.ANTHROPIC_API_KEY || "").trim());

  const svc = createSupabaseServiceRoleClient();
  if (!svc) {
    const anthropic_ready = platformEligible && platformKeySet;
    return NextResponse.json(
      {
        configured: false,
        canManage,
        plan,
        platform_ai_eligible: platformEligible,
        platform_ai_configured: platformKeySet,
        key_source: anthropic_ready ? ("platform" as const) : ("none" as const),
        anthropic_ready,
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not set on the server. Workspace AI keys cannot be loaded."
      },
      { status: 200 }
    );
  }

  const { data: row, error } = await svc
    .from("company_ai_keys")
    .select("updated_at")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error && !isMissingCompanyAiKeysTable(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byokStorageMissing = Boolean(error && isMissingCompanyAiKeysTable(error));
  const byok = Boolean(row) && !byokStorageMissing;
  const anthropic_ready = byok || (platformEligible && platformKeySet);
  const key_source = byok ? ("workspace" as const) : platformEligible && platformKeySet ? ("platform" as const) : ("none" as const);

  return NextResponse.json({
    configured: byok,
    canManage,
    updated_at: row?.updated_at ?? null,
    plan,
    platform_ai_eligible: platformEligible,
    platform_ai_configured: platformKeySet,
    key_source,
    anthropic_ready,
    workspace_key_storage_ready: !byokStorageMissing,
    warning: byokStorageMissing
      ? "Workspace key storage is not installed yet. In the Supabase dashboard, open SQL Editor and run the script from supabase/company_ai_keys.sql in this project. After that, owners can save BYOK keys here. Platform AI still works when your plan allows it and ANTHROPIC_API_KEY is set on the server."
      : undefined
  });
}

export async function POST(req: Request) {
  const admin = await isWorkspaceAdminForSelectedCompany();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  let body: { apiKey?: string };
  try {
    body = (await req.json()) as { apiKey?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const apiKey = (body.apiKey ?? "").trim();
  if (!apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Invalid key format. Anthropic secret keys start with sk-ant-." },
      { status: 400 }
    );
  }

  let ciphertext: string;
  try {
    ciphertext = encryptWorkspaceSecret(apiKey);
  } catch (e) {
    const raw = e instanceof Error ? e.message : "";
    const missingSecret =
      raw.includes("WORKSPACE_AI_KEY_ENCRYPTION_SECRET") || raw.includes("Missing WORKSPACE");
    return NextResponse.json(
      {
        error: missingSecret
          ? "The server cannot encrypt workspace keys yet. Add WORKSPACE_AI_KEY_ENCRYPTION_SECRET (a long random string) in your host’s environment — e.g. Vercel → Project → Settings → Environment Variables — for Production (and Preview if you use it), then redeploy. See .env.local.example."
          : raw || "Encryption failed. Set WORKSPACE_AI_KEY_ENCRYPTION_SECRET on the server."
      },
      { status: 500 }
    );
  }

  const svc = createSupabaseServiceRoleClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const { error } = await svc.from("company_ai_keys").upsert(
    {
      company_id: admin.companyId,
      ciphertext,
      updated_at: new Date().toISOString()
    },
    { onConflict: "company_id" }
  );

  if (error) {
    if (isMissingCompanyAiKeysTable(error)) {
      return NextResponse.json(
        {
          error:
            "Database table company_ai_keys is missing. In Supabase → SQL Editor, run supabase/company_ai_keys.sql from the repo, then try again."
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const admin = await isWorkspaceAdminForSelectedCompany();
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const plan = await getCompanyPlan(admin.companyId);
  if (plan === "enterprise") {
    return NextResponse.json(
      {
        error:
          "Enterprise workspaces must keep a workspace Anthropic API key (BYOK). Removing the key is not allowed — add a replacement key instead of deleting."
      },
      { status: 400 }
    );
  }

  const svc = createSupabaseServiceRoleClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Server missing SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const { error } = await svc.from("company_ai_keys").delete().eq("company_id", admin.companyId);
  if (error) {
    if (isMissingCompanyAiKeysTable(error)) {
      return NextResponse.json(
        {
          error:
            "Database table company_ai_keys is missing. In Supabase → SQL Editor, run supabase/company_ai_keys.sql from the repo."
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
