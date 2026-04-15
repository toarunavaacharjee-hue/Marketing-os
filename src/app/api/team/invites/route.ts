import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEntitlements, normalizePlan } from "@/lib/planEntitlements";
import { env } from "@/lib/env";

type InviteRow = {
  id: string;
  company_id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

async function getCompanyPlan(companyId: string) {
  const supabase = createSupabaseServerClient();
  const { data: sub } = await supabase
    .from("company_subscriptions")
    .select("plan")
    .eq("company_id", companyId)
    .maybeSingle();

  if (sub && (sub as any).plan) {
    return normalizePlan(String((sub as any).plan));
  }

  const { data: owner } = await supabase
    .from("company_members")
    .select("user_id, role, profiles(plan)")
    .eq("company_id", companyId)
    .in("role", ["owner"])
    .limit(1)
    .maybeSingle();
  const plan = (owner as any)?.profiles?.plan ?? "starter";
  return normalizePlan(plan);
}

export async function GET(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(req.url);
  const companyId = (url.searchParams.get("company_id") ?? "").trim();
  if (!companyId) return NextResponse.json({ error: "company_id is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("company_invites")
    .select("id,company_id,email,role,token,created_at,expires_at,accepted_at,revoked_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ invites: (data ?? []) as InviteRow[] });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json()) as { company_id?: string; email?: string; role?: string };
  const companyId = (body.company_id ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const role = (body.role ?? "member").trim();
  if (!companyId) return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  if (!["owner", "admin", "member"].includes(role)) {
    return NextResponse.json({ error: "role must be owner|admin|member." }, { status: 400 });
  }

  // Seat limit enforcement: based on owner plan.
  const plan = await getCompanyPlan(companyId);
  const ent = getEntitlements(plan);
  if (ent.seatsMax !== null) {
    const { count: memberCount } = await supabase
      .from("company_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", companyId);
    const { count: pendingInvites } = await supabase
      .from("company_invites")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("accepted_at", null)
      .is("revoked_at", null);

    const seatsUsed = (memberCount ?? 0) + (pendingInvites ?? 0);
    if (seatsUsed >= ent.seatsMax) {
      return NextResponse.json(
        {
          error: `Seat limit reached for ${plan}. Upgrade to add more team members.`,
          code: "UPGRADE_REQUIRED"
        },
        { status: 402 }
      );
    }
  }

  const token = crypto.randomUUID().replace(/-/g, "");

  const { data: row, error } = await supabase
    .from("company_invites")
    .insert({
      company_id: companyId,
      email,
      role,
      token,
      created_by: user.id
    })
    .select("id,company_id,email,role,token,created_at,expires_at,accepted_at,revoked_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // IMPORTANT: never build invite links off the request Origin, because on Vercel it can be a protected
  // *.vercel.app deployment URL. Invitees should land on the public app domain.
  const base = String(env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  const inviteUrl = base ? `${base}/invite/${token}` : `/invite/${token}`;
  return NextResponse.json({ invite: row as InviteRow, invite_url: inviteUrl });
}

export async function DELETE(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const url = new URL(req.url);
  const inviteId = (url.searchParams.get("id") ?? "").trim();
  if (!inviteId) return NextResponse.json({ error: "id is required." }, { status: 400 });

  // Soft revoke: update revoked_at so history is preserved.
  const { error } = await supabase
    .from("company_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json()) as { token?: string };
  const token = (body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "token is required." }, { status: 400 });

  // Seat limit at accept time (based on owner plan). We do this before the RPC
  // so we can return an upgrade CTA code.
  // Note: the RPC itself validates token + email match + expiry.
  const { data: invMeta } = await supabase
    .from("company_invites")
    .select("company_id,accepted_at,revoked_at,expires_at")
    .eq("token", token)
    .maybeSingle();

  // If RLS blocks this select (user isn't a member yet), skip precheck and let RPC return the real error.
  const companyId = (invMeta as any)?.company_id as string | undefined;
  if (companyId) {
    const plan = await getCompanyPlan(companyId);
    const ent = getEntitlements(plan);
    if (ent.seatsMax !== null) {
      const { count: memberCount } = await supabase
        .from("company_members")
        .select("user_id", { count: "exact", head: true })
        .eq("company_id", companyId);
      if ((memberCount ?? 0) >= ent.seatsMax) {
        return NextResponse.json(
          { error: `Seat limit reached for ${plan}. Ask your admin to upgrade.`, code: "UPGRADE_REQUIRED" },
          { status: 402 }
        );
      }
    }
  }

  const { data, error } = await supabase.rpc("accept_company_invite", { invite_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data ?? { ok: true });
}

