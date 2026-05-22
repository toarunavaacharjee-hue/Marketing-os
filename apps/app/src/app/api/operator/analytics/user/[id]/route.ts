import { NextResponse } from "next/server";
import { getOperatorGate } from "@/lib/platformAdmin";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

export type UserActivityEntry = {
  id: number;
  event: string;
  module: string | null;
  status: string;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  durationMs: number | null;
  createdAt: string;
};

export type UserActivitySummary = {
  total: number;
  aiQueries: number;
  pageViews: number;
  errors: number;
  moduleBreakdown: { module: string; label: string; total: number; aiQueries: number }[];
  recentActivity: UserActivityEntry[];
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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const gate = await getOperatorGate();
  if (!gate.ok) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  const admin = createSupabaseServiceRoleClient();
  const userId = params.id;

  const d30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const { data, error } = await admin
    .from("activity_log")
    .select("id, event, module, status, error_message, metadata, duration_ms, created_at")
    .eq("user_id", userId)
    .gte("created_at", d30)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("does not exist") || m.includes("schema cache")) {
      return NextResponse.json({ missingTable: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Row = { id: number; event: string; module: string | null; status: string; error_message: string | null; metadata: Record<string, unknown>; duration_ms: number | null; created_at: string };
  const rows = (data ?? []) as Row[];

  const total = rows.length;
  const aiQueries = rows.filter((r) => r.event === "ai_query").length;
  const pageViews = rows.filter((r) => r.event === "page_view").length;
  const errors = rows.filter((r) => r.status === "error").length;

  type ModCell = { total: number; aiQueries: number };
  const modMap = new Map<string, ModCell>();
  rows.forEach((r) => {
    const mod = r.module ?? "__none__";
    if (mod === "__none__") return;
    if (!modMap.has(mod)) modMap.set(mod, { total: 0, aiQueries: 0 });
    const cell = modMap.get(mod)!;
    cell.total++;
    if (r.event === "ai_query") cell.aiQueries++;
  });

  const moduleBreakdown = Array.from(modMap.entries())
    .map(([mod, cell]) => ({ module: mod, label: MODULE_LABELS[mod] ?? mod, ...cell }))
    .sort((a, b) => b.total - a.total);

  const recentActivity: UserActivityEntry[] = rows.slice(0, 200).map((r) => ({
    id: r.id,
    event: r.event,
    module: r.module,
    status: r.status,
    errorMessage: r.error_message,
    metadata: r.metadata ?? {},
    durationMs: r.duration_ms,
    createdAt: r.created_at
  }));

  return NextResponse.json({ total, aiQueries, pageViews, errors, moduleBreakdown, recentActivity } as UserActivitySummary);
}
