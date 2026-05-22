import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export type TrendDay = {
  day: string;
  total: number;
  aiQueries: number;
  errors: number;
  pageViews: number;
};

export type ModuleHeatmapCell = {
  module: string;
  label: string;
  total: number;
  uniqueUsers: number;
  aiQueries: number;
  errors: number;
  lastUsed: string | null;
};

export type TopUser = {
  userId: string;
  email: string | null;
  name: string | null;
  total: number;
  aiQueries: number;
  pageViews: number;
  errors: number;
  lastActive: string | null;
};

export type ErrorEntry = {
  id: number;
  userId: string;
  email: string | null;
  event: string;
  module: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type EventBreakdown = { event: string; total: number };

export type AnalyticsSummary = {
  dau: number;
  wau: number;
  mau: number;
  totalEvents30d: number;
  aiQueries30d: number;
  pageViews30d: number;
  errorRate: number;
  trend: TrendDay[];
  heatmap: ModuleHeatmapCell[];
  topUsers: TopUser[];
  recentErrors: ErrorEntry[];
  eventBreakdown: EventBreakdown[];
  missingTable?: boolean;
};

const MODULE_LABELS: Record<string, string> = {
  "overview": "Overview",
  "market-research": "Market Research",
  "icp-segmentation": "ICP Segmentation",
  "positioning-studio": "Positioning Studio",
  "messaging-artifacts": "Messaging Pillars",
  "artifacts": "Artifact Library",
  "launch-playbook": "Launch Playbook",
  "campaigns": "Campaigns",
  "gtm-planner": "GTM Planner",
  "events": "Events",
  "content-studio": "Content Studio",
  "social-media": "Social Media",
  "design-assets": "Design & Assets",
  "presentations": "Presentations",
  "website-pages": "Website & Pages",
  "analytics": "Analytics",
  "battlecards": "Battlecards",
  "prospect-research": "Prospect Research",
  "sales-intelligence": "Sales Intelligence",
  "customer-insights": "Customer Insights",
  "copilot": "AI Copilot",
  "daily-brief": "Daily Brief",
};

function isMissingTable(msg: string) {
  const m = msg.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("could not find the table") ||
    m.includes("relation") && m.includes("exist")
  );
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  if (!admin) return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY on server." }, { status: 500 });

  const now = new Date();
  const d1 = new Date(now.getTime() - 1 * 86400000).toISOString();
  const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 86400000).toISOString();
  const d14 = new Date(now.getTime() - 14 * 86400000).toISOString();

  // Fetch last 30 days of events in one query, aggregate client-side
  const { data: events, error } = await admin
    .from("activity_log")
    .select("user_id, event, module, status, error_message, created_at")
    .gte("created_at", d30)
    .order("created_at", { ascending: false })
    .limit(50000);

  if (error) {
    if (isMissingTable(error.message)) {
      return NextResponse.json({ missingTable: true } as Partial<AnalyticsSummary>);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch emails from auth for top users
  const { data: rawErrors } = await admin
    .from("activity_log")
    .select("id, user_id, event, module, error_message, created_at")
    .eq("status", "error")
    .order("created_at", { ascending: false })
    .limit(200);

  type Row = { user_id: string; event: string; module: string | null; status: string; error_message: string | null; created_at: string };
  const rows = (events ?? []) as Row[];

  // DAU / WAU / MAU
  const dauSet = new Set<string>();
  const wauSet = new Set<string>();
  const mauSet = new Set<string>();
  rows.forEach((r) => {
    mauSet.add(r.user_id);
    if (r.created_at >= d7) wauSet.add(r.user_id);
    if (r.created_at >= d1) dauSet.add(r.user_id);
  });

  const totalEvents30d = rows.length;
  const aiQueries30d = rows.filter((r) => r.event === "ai_query").length;
  const pageViews30d = rows.filter((r) => r.event === "page_view").length;
  const errorCount = rows.filter((r) => r.status === "error").length;
  const errorRate = totalEvents30d > 0 ? Math.round((errorCount / totalEvents30d) * 1000) / 10 : 0;

  // 14-day trend
  const trendMap = new Map<string, TrendDay>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = dayKey(d);
    trendMap.set(key, { day: key, total: 0, aiQueries: 0, errors: 0, pageViews: 0 });
  }
  rows.filter((r) => r.created_at >= d14).forEach((r) => {
    const key = r.created_at.slice(0, 10);
    const cell = trendMap.get(key);
    if (!cell) return;
    cell.total++;
    if (r.event === "ai_query") cell.aiQueries++;
    if (r.status === "error") cell.errors++;
    if (r.event === "page_view") cell.pageViews++;
  });

  // Module heatmap
  type HeatCell = { total: number; uniqueUsers: Set<string>; aiQueries: number; errors: number; lastUsed: string | null };
  const heatMap = new Map<string, HeatCell>();
  rows.forEach((r) => {
    const mod = r.module ?? "__none__";
    if (!heatMap.has(mod)) {
      heatMap.set(mod, { total: 0, uniqueUsers: new Set(), aiQueries: 0, errors: 0, lastUsed: null });
    }
    const cell = heatMap.get(mod)!;
    cell.total++;
    cell.uniqueUsers.add(r.user_id);
    if (r.event === "ai_query") cell.aiQueries++;
    if (r.status === "error") cell.errors++;
    if (!cell.lastUsed || r.created_at > cell.lastUsed) cell.lastUsed = r.created_at;
  });

  const heatmap: ModuleHeatmapCell[] = Array.from(heatMap.entries())
    .filter(([mod]) => mod !== "__none__")
    .map(([mod, cell]) => ({
      module: mod,
      label: MODULE_LABELS[mod] ?? mod,
      total: cell.total,
      uniqueUsers: cell.uniqueUsers.size,
      aiQueries: cell.aiQueries,
      errors: cell.errors,
      lastUsed: cell.lastUsed
    }))
    .sort((a, b) => b.total - a.total);

  // Top users
  type UserStats = { total: number; aiQueries: number; pageViews: number; errors: number; lastActive: string | null };
  const userMap = new Map<string, UserStats>();
  rows.forEach((r) => {
    if (!userMap.has(r.user_id)) {
      userMap.set(r.user_id, { total: 0, aiQueries: 0, pageViews: 0, errors: 0, lastActive: null });
    }
    const u = userMap.get(r.user_id)!;
    u.total++;
    if (r.event === "ai_query") u.aiQueries++;
    if (r.event === "page_view") u.pageViews++;
    if (r.status === "error") u.errors++;
    if (!u.lastActive || r.created_at > u.lastActive) u.lastActive = r.created_at;
  });

  const topUserIds = Array.from(userMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20)
    .map(([id]) => id);

  // Look up emails + names
  const emailMap = new Map<string, { email: string | null; name: string | null }>();
  if (topUserIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, name")
      .in("id", topUserIds);
    (profiles ?? []).forEach((p: { id: string; name: string | null }) => {
      emailMap.set(p.id, { email: null, name: p.name });
    });
    // Fetch emails via auth admin
    for (const uid of topUserIds) {
      const { data: u } = await admin.auth.admin.getUserById(uid);
      if (u.user) {
        const existing = emailMap.get(uid) ?? { email: null, name: null };
        emailMap.set(uid, { ...existing, email: u.user.email ?? null });
      }
    }
  }

  const topUsers: TopUser[] = topUserIds.map((uid) => {
    const stats = userMap.get(uid)!;
    const info = emailMap.get(uid) ?? { email: null, name: null };
    return { userId: uid, ...info, ...stats };
  });

  // Event breakdown
  const evtMap = new Map<string, number>();
  rows.forEach((r) => { evtMap.set(r.event, (evtMap.get(r.event) ?? 0) + 1); });
  const eventBreakdown: EventBreakdown[] = Array.from(evtMap.entries())
    .map(([event, total]) => ({ event, total }))
    .sort((a, b) => b.total - a.total);

  // Recent errors with emails
  type ErrorRow = { id: number; user_id: string; event: string; module: string | null; error_message: string | null; created_at: string };
  const errRows = ((rawErrors ?? []) as ErrorRow[]).slice(0, 100);
  const errUserIds = [...new Set(errRows.map((r) => r.user_id))];
  const errEmailMap = new Map<string, string | null>();
  for (const uid of errUserIds) {
    const { data: u } = await admin.auth.admin.getUserById(uid);
    errEmailMap.set(uid, u.user?.email ?? null);
  }
  const recentErrors: ErrorEntry[] = errRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    email: errEmailMap.get(r.user_id) ?? null,
    event: r.event,
    module: r.module,
    errorMessage: r.error_message,
    createdAt: r.created_at
  }));

  const summary: AnalyticsSummary = {
    dau: dauSet.size,
    wau: wauSet.size,
    mau: mauSet.size,
    totalEvents30d,
    aiQueries30d,
    pageViews30d,
    errorRate,
    trend: Array.from(trendMap.values()),
    heatmap,
    topUsers,
    recentErrors,
    eventBreakdown
  };

  return NextResponse.json(summary);
}
