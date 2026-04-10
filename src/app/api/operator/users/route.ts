import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { writeOperatorAuditLog } from "@/lib/operator/operatorAuditLog";

type ProfileRow = {
  id: string;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number | null;
  is_platform_admin: boolean | null;
  created_at: string | null;
};

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = v ? Number.parseInt(v, 10) : def;
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

export async function GET(req: Request) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const page = clampInt(url.searchParams.get("page"), 1, 1, 50);
  const perPage = clampInt(url.searchParams.get("perPage"), 50, 10, 200);

  const users: User[] = [];
  const startPage = page;
  for (let p = startPage; p < startPage + 3; p++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: p, perPage });
    if (error) break;
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < perPage) break;
  }

  const ids = users.map((u) => u.id);
  const { data: profilesRaw } = await admin.from("profiles").select("*").in("id", ids);
  const profiles = (profilesRaw ?? []) as ProfileRow[];
  const profMap = new Map(profiles.map((p) => [p.id, p]));

  const { data: membershipRows } =
    ids.length > 0
      ? await admin
          .from("company_members")
          .select("user_id, role, company_id, companies(name)")
          .in("user_id", ids)
      : { data: [] as any[] };

  const workspacesByUser = new Map<
    string,
    Array<{ company_id: string; company_name: string | null; role: string }>
  >();
  for (const row of membershipRows ?? []) {
    const uid = String((row as { user_id: string }).user_id);
    const cid = String((row as { company_id: string }).company_id);
    const role = String((row as { role?: string }).role ?? "member");
    const companyName =
      (row as { companies?: { name?: string | null } | null }).companies?.name ?? null;
    if (!workspacesByUser.has(uid)) workspacesByUser.set(uid, []);
    workspacesByUser.get(uid)!.push({
      company_id: cid,
      company_name: companyName,
      role
    });
  }
  for (const [, list] of workspacesByUser) {
    list.sort((a, b) => {
      const ra = a.role === "owner" ? 0 : a.role === "admin" ? 1 : 2;
      const rb = b.role === "owner" ? 0 : b.role === "admin" ? 1 : 2;
      if (ra !== rb) return ra - rb;
      return (a.company_name ?? "").localeCompare(b.company_name ?? "");
    });
  }

  const rows = users
    .map((u) => {
      const pr = profMap.get(u.id);
      const workspaces = workspacesByUser.get(u.id) ?? [];
      return {
        id: u.id,
        email: u.email ?? null,
        auth_created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        name: pr?.name ?? null,
        company: pr?.company ?? null,
        plan: pr?.plan ?? null,
        ai_queries_used: pr?.ai_queries_used ?? 0,
        is_platform_admin: Boolean(pr?.is_platform_admin),
        profile_created_at: pr?.created_at ?? null,
        workspaces
      };
    })
    .filter((r) => {
      if (!q) return true;
      const wsHit = (r.workspaces ?? []).some(
        (w) =>
          (w.company_name ?? "").toLowerCase().includes(q) ||
          w.company_id.toLowerCase().includes(q) ||
          (w.role ?? "").toLowerCase().includes(q)
      );
      return (
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.company ?? "").toLowerCase().includes(q) ||
        wsHit
      );
    })
    .sort((a, b) => {
      const ta = a.auth_created_at ? new Date(a.auth_created_at).getTime() : 0;
      const tb = b.auth_created_at ? new Date(b.auth_created_at).getTime() : 0;
      return tb - ta;
    });

  await writeOperatorAuditLog({
    admin,
    req,
    operatorUserId: gate.userId,
    action: "operator.data.read",
    targetType: "system",
    targetId: "users.list",
    metadata: { page, perPage, q: q || null, returned: rows.length }
  });

  return NextResponse.json({ ok: true, page, perPage, users: rows });
}

