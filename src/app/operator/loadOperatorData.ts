import type { User } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export type OperatorSubscriberRow = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number;
  is_platform_admin: boolean;
  profile_created_at: string | null;
  auth_created_at: string | null;
  last_sign_in_at: string | null;
};

export type OperatorStats = {
  subscriberCount: number;
  newSubscribers7d: number;
  companyCount: number;
  productCount: number;
  environmentCount: number;
  researchScanCount: number;
  syncRunCount: number | null;
  totalAiQueries: number;
  companyPlanBreakdown: Record<string, number>;
};

export type OperatorCompanyRow = {
  id: string;
  name: string | null;
  members_count: number;
  products_count: number;
  plan: string | null;
  status: string | null;
  seats_included: number | null;
  seats_addon: number | null;
  products_included: number | null;
  products_addon: number | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
  company: string | null;
  plan: string | null;
  ai_queries_used: number | null;
  is_platform_admin: boolean | null;
  created_at: string | null;
};

export type OperatorData =
  | {
      serviceRole: true;
      stats: OperatorStats;
      companies: OperatorCompanyRow[];
      subscribers: OperatorSubscriberRow[];
    }
  | { serviceRole: false; message: string };

export async function loadOperatorData(): Promise<OperatorData> {
  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return {
      serviceRole: false,
      message:
        "Set SUPABASE_SERVICE_ROLE_KEY in the server environment (Vercel / .env.local). Never expose this key to the browser. It is required to list subscribers and aggregate usage across tenants."
    };
  }

  const allAuthUsers: User[] = [];
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const batch = data?.users ?? [];
    allAuthUsers.push(...batch);
    if (batch.length < 200) break;
    page += 1;
    if (page > 25) break;
  }

  const { data: profilesRaw, error: pErr } = await admin.from("profiles").select("*");
  const profiles = ((pErr ? [] : profilesRaw) ?? []) as ProfileRow[];
  const profMap = new Map(profiles.map((p) => [p.id, p]));

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const newSubscribers7d = allAuthUsers.filter((u) => {
    const t = u.created_at ? new Date(u.created_at).getTime() : 0;
    return t >= sevenDaysAgo;
  }).length;

  const subscribers: OperatorSubscriberRow[] = allAuthUsers
    .map((u) => {
      const pr = profMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? null,
        name: pr?.name ?? null,
        company: pr?.company ?? null,
        plan: pr?.plan ?? null,
        ai_queries_used: pr?.ai_queries_used ?? 0,
        is_platform_admin: Boolean(pr?.is_platform_admin),
        profile_created_at: pr?.created_at ?? null,
        auth_created_at: u.created_at ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null
      };
    })
    .sort((a, b) => {
      const ta = a.auth_created_at ? new Date(a.auth_created_at).getTime() : 0;
      const tb = b.auth_created_at ? new Date(b.auth_created_at).getTime() : 0;
      return tb - ta;
    });

  const totalAiQueries = profiles.reduce((s, p) => s + (p.ai_queries_used ?? 0), 0);

  const [cRes, pRes, eRes, rRes, sRes] = await Promise.all([
    admin.from("companies").select("id", { count: "exact", head: true }),
    admin.from("products").select("id", { count: "exact", head: true }),
    admin.from("product_environments").select("id", { count: "exact", head: true }),
    admin.from("research_scans").select("id", { count: "exact", head: true }),
    admin.from("sync_runs").select("id", { count: "exact", head: true })
  ]);

  const companyCount = cRes.error ? null : cRes.count ?? 0;
  const productCount = pRes.error ? null : pRes.count ?? 0;
  const environmentCount = eRes.error ? null : eRes.count ?? 0;
  const researchScanCount = rRes.error ? null : rRes.count ?? 0;
  const syncRunCount = sRes.error ? null : sRes.count ?? 0;

  const stats: OperatorStats = {
    subscriberCount: allAuthUsers.length,
    newSubscribers7d,
    companyCount: companyCount ?? 0,
    productCount: productCount ?? 0,
    environmentCount: environmentCount ?? 0,
    researchScanCount: researchScanCount ?? 0,
    syncRunCount: syncRunCount === null ? null : syncRunCount,
    totalAiQueries,
    companyPlanBreakdown: {}
  };

  // Companies + subscriptions + member counts (best-effort; table may not exist yet)
  let companies: OperatorCompanyRow[] = [];
  try {
    const { data: cRows, error: cErr } = await admin.from("companies").select("id,name");
    if (!cErr) {
      const companyIds = (cRows ?? []).map((c: any) => String(c.id));

      const { data: subs, error: sErr } = await admin
        .from("company_subscriptions")
        .select("company_id,plan,status,seats_included,seats_addon,products_included,products_addon")
        .in("company_id", companyIds);

      const subList = (sErr ? [] : subs ?? []) as any[];
      const subMap = new Map(subList.map((s: any) => [String(s.company_id), s]));

      // Company plan breakdown from subscriptions
      const companyPlanBreakdown: Record<string, number> = {};
      subList.forEach((s: any) => {
        const key = String(s?.plan ?? "unknown").toLowerCase() || "unknown";
        companyPlanBreakdown[key] = (companyPlanBreakdown[key] ?? 0) + 1;
      });
      stats.companyPlanBreakdown = companyPlanBreakdown;

      const { data: members } = await admin.from("company_members").select("company_id");
      const countMap = new Map<string, number>();
      (members ?? []).forEach((r: any) => {
        const cid = String(r.company_id);
        countMap.set(cid, (countMap.get(cid) ?? 0) + 1);
      });

      const { data: products } = await admin.from("products").select("id,company_id");
      const productCountMap = new Map<string, number>();
      (products ?? []).forEach((r: any) => {
        const cid = String(r.company_id);
        productCountMap.set(cid, (productCountMap.get(cid) ?? 0) + 1);
      });

      companies = (cRows ?? []).map((c: any) => {
        const cid = String(c.id);
        const sub = subMap.get(cid) as any;
        return {
          id: cid,
          name: typeof c.name === "string" ? c.name : null,
          members_count: countMap.get(cid) ?? 0,
          products_count: productCountMap.get(cid) ?? 0,
          plan: sub?.plan ?? null,
          status: sub?.status ?? null,
          seats_included: typeof sub?.seats_included === "number" ? sub.seats_included : null,
          seats_addon: typeof sub?.seats_addon === "number" ? sub.seats_addon : null,
          products_included: typeof sub?.products_included === "number" ? sub.products_included : null,
          products_addon: typeof sub?.products_addon === "number" ? sub.products_addon : null
        };
      });
    }
  } catch {
    companies = [];
  }

  return { serviceRole: true, stats, companies, subscribers };
}

