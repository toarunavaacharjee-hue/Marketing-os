import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { getSelectedCompanyId } from "@/lib/companyContext";

const MODULE = "integrations";
const KEY = "connectors";

type Connector = {
  enabled: boolean;
  account_id: string;
  token: string;
  notes: string;
};
type ConnectorsMap = Record<string, Connector>;

function maskToken(token: string | undefined): string {
  const t = (token ?? "").trim();
  if (!t) return "";
  return t.length >= 8 ? `••••••••${t.slice(-4)}` : "••••••••";
}

function isMasked(value: string): boolean {
  return value.startsWith("••");
}

async function getAdminRole(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string
): Promise<string | null> {
  const companyId = await getSelectedCompanyId();
  if (!companyId) return null;
  const { data } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  return String((data as { role?: string } | null)?.role ?? "").toLowerCase() || null;
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const role = await getAdminRole(supabase, user.id);
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can view integration tokens." },
        { status: 403 }
      );
    }

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { data, error } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", MODULE)
      .eq("key", KEY)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const raw = ((data?.value_json ?? {}) as ConnectorsMap);
    const masked: ConnectorsMap = {};
    for (const [k, v] of Object.entries(raw)) {
      masked[k] = { ...v, token: maskToken(v.token) };
    }

    return NextResponse.json({ settings: masked });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const role = await getAdminRole(supabase, user.id);
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json(
        { error: "Only workspace admins can update integration tokens." },
        { status: 403 }
      );
    }

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as { settings: ConnectorsMap };
    if (!body.settings || typeof body.settings !== "object") {
      return NextResponse.json({ error: "settings is required." }, { status: 400 });
    }

    // Read existing to preserve tokens when the browser sends back a masked placeholder
    const { data: existing } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", MODULE)
      .eq("key", KEY)
      .maybeSingle();

    const existingMap = ((existing?.value_json ?? {}) as ConnectorsMap);

    const merged: ConnectorsMap = {};
    for (const [k, v] of Object.entries(body.settings)) {
      const existingToken = existingMap[k]?.token ?? "";
      merged[k] = {
        ...v,
        token: isMasked(v.token) ? existingToken : v.token.trim()
      };
    }

    const { error } = await supabase.from("module_settings").upsert({
      environment_id: ctx.environmentId,
      module: MODULE,
      key: KEY,
      value_json: merged
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
