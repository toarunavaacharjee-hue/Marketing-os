import { createSupabaseServerClient } from "@/lib/supabase/server";
import { POSITIONING_KEY, POSITIONING_MODULE, type PositioningCanvasValue } from "@/lib/positioningStudio";

type SupabaseClient = ReturnType<typeof createSupabaseServerClient>;

function clip(s: string | null | undefined, max = 120): string {
  if (!s) return "";
  const t = s.trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export async function gatherWorkspaceContext(
  supabase: SupabaseClient,
  environmentId: string,
  productId: string
): Promise<string> {
  const [posRes, segRes, compRes, cardRes, msgRes, campRes, siRes, scanRes] = await Promise.allSettled([
    // 1. Positioning canvas
    supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", POSITIONING_MODULE)
      .eq("key", POSITIONING_KEY)
      .maybeSingle(),

    // 2. ICP segments
    supabase
      .from("segments")
      .select("name,pnf_score,pain_points")
      .eq("environment_id", environmentId)
      .order("pnf_score", { ascending: false })
      .limit(6),

    // 3. Competitors list
    supabase
      .from("product_competitors")
      .select("id,name")
      .eq("product_id", productId)
      .limit(8),

    // 4. Battlecards
    supabase
      .from("battlecards")
      .select("competitor_id,why_we_win,strengths,weaknesses")
      .eq("environment_id", environmentId)
      .limit(8),

    // 5. Messaging pillars
    supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "messaging_artifacts")
      .eq("key", "pillars")
      .maybeSingle(),

    // 6. Campaigns kanban
    supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "campaigns")
      .eq("key", "kanban")
      .maybeSingle(),

    // 7. Sales intelligence
    supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "sales_intelligence")
      .eq("key", "workspace")
      .maybeSingle(),

    // 8. Latest market research scan
    supabase
      .from("research_scans")
      .select("result_json")
      .eq("environment_id", environmentId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const parts: string[] = [];

  // Positioning
  if (posRes.status === "fulfilled" && posRes.value.data) {
    const canvas = (posRes.value.data as { value_json: PositioningCanvasValue }).value_json?.doc;
    if (canvas) {
      const lines = [
        canvas.category && `Category: ${clip(canvas.category)}`,
        canvas.target && `Target: ${clip(canvas.target)}`,
        canvas.problem && `Problem: ${clip(canvas.problem)}`,
        canvas.solution && `Solution: ${clip(canvas.solution)}`,
        canvas.diff && `Differentiation: ${clip(canvas.diff)}`,
        canvas.wedge && `Wedge: ${clip(canvas.wedge)}`,
      ].filter(Boolean).join("\n");
      if (lines) parts.push(`### Positioning\n${lines}`);
    }
  }

  // ICP Segments
  if (segRes.status === "fulfilled" && segRes.value.data?.length) {
    type SegRow = { name: string; pnf_score: number; pain_points: string[] };
    const lines = (segRes.value.data as SegRow[]).map((s) => {
      const pains = (s.pain_points ?? []).slice(0, 3).join(", ");
      return `- ${s.name} (PnF ${s.pnf_score})${pains ? ` — Pains: ${pains}` : ""}`;
    }).join("\n");
    parts.push(`### ICP Segments\n${lines}`);
  }

  // Battlecards
  if (cardRes.status === "fulfilled" && cardRes.value.data?.length) {
    type CompRow = { id: string; name: string };
    type CardRow = { competitor_id: string; why_we_win: string | null; strengths: string | null; weaknesses: string | null };
    const compMap = new Map(
      compRes.status === "fulfilled"
        ? (compRes.value.data as CompRow[]).map((c) => [c.id, c.name])
        : []
    );
    const lines = (cardRes.value.data as CardRow[]).map((b) => {
      const name = compMap.get(b.competitor_id) ?? "Competitor";
      const detail = [
        b.why_we_win && `Win: ${clip(b.why_we_win, 80)}`,
        b.weaknesses && `Weakness: ${clip(b.weaknesses, 60)}`,
      ].filter(Boolean).join("; ");
      return `- ${name}${detail ? ": " + detail : ""}`;
    }).join("\n");
    parts.push(`### Battlecards\n${lines}`);
  } else if (compRes.status === "fulfilled" && compRes.value.data?.length) {
    type CompRow = { name: string };
    const names = (compRes.value.data as CompRow[]).map((c) => c.name).join(", ");
    parts.push(`### Competitors\n${names}`);
  }

  // Messaging pillars
  if (msgRes.status === "fulfilled" && msgRes.value.data) {
    const pillars = (msgRes.value.data as { value_json: Record<string, unknown> }).value_json;
    if (pillars && typeof pillars === "object") {
      const lines = Object.entries(pillars)
        .slice(0, 4)
        .map(([, pillar]) => {
          const p = pillar as Record<string, unknown>;
          const segName = p.segmentName ?? p.segment_name ?? "Segment";
          const headline = clip(p.headline as string, 70);
          return `- ${segName}: "${headline}"`;
        })
        .join("\n");
      if (lines) parts.push(`### Messaging Pillars\n${lines}`);
    }
  }

  // Campaigns
  if (campRes.status === "fulfilled" && campRes.value.data) {
    type CampValue = { columns: Record<string, Array<{ title: string }>> };
    const v = (campRes.value.data as { value_json: CampValue }).value_json;
    if (v?.columns) {
      const colLabels: Record<string, string> = {
        planning: "Planning",
        "in-progress": "In Progress",
        "in-review": "In Review",
        live: "Live",
      };
      const active: string[] = [];
      for (const [key, cards] of Object.entries(v.columns)) {
        const label = colLabels[key] ?? key;
        for (const card of cards.slice(0, 3)) {
          active.push(`${card.title} [${label}]`);
        }
      }
      if (active.length) parts.push(`### Campaigns\n${active.map((c) => `- ${c}`).join("\n")}`);
    }
  }

  // Sales Intelligence
  if (siRes.status === "fulfilled" && siRes.value.data) {
    type SIWorkspace = {
      objections?: Array<{ text: string; frequency: number }>;
      winloss?: Array<{ segment: string; wins: number; losses: number }>;
    };
    const si = (siRes.value.data as { value_json: SIWorkspace }).value_json;
    const siLines: string[] = [];

    if (si?.objections?.length) {
      const top = [...si.objections]
        .sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
        .slice(0, 3)
        .map((o) => `"${clip(o.text, 60)}" (${o.frequency}%)`)
        .join(", ");
      siLines.push(`Top objections: ${top}`);
    }
    if (si?.winloss?.length) {
      const summary = si.winloss
        .slice(0, 3)
        .map((wl) => {
          const total = (wl.wins ?? 0) + (wl.losses ?? 0);
          const rate = total ? Math.round(((wl.wins ?? 0) / total) * 100) : 0;
          return `${wl.segment}: ${rate}% win rate`;
        })
        .join(", ");
      siLines.push(`Win rates: ${summary}`);
    }
    if (siLines.length) parts.push(`### Sales Intelligence\n${siLines.join("\n")}`);
  }

  // Market research signals
  if (scanRes.status === "fulfilled" && scanRes.value.data?.[0]) {
    type ScanResult = { signals?: Array<{ title: string; severity: string }> };
    const result = (scanRes.value.data[0] as { result_json: ScanResult }).result_json;
    const signals = (result?.signals ?? []).slice(0, 4);
    if (signals.length) {
      const lines = signals
        .map((s) => `- ${clip(s.title, 90)} [${s.severity}]`)
        .join("\n");
      parts.push(`### Market Signals\n${lines}`);
    }
  }

  if (!parts.length) return "";
  return `\n\n## Workspace Context\n${parts.join("\n\n")}`;
}
