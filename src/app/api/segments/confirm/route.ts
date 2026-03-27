import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type DraftSegment = {
  name: string;
  pnf_score: number;
  pain_points: string[];
  urgency: number;
  budget_fit: number;
  acv_potential: number;
  retention_potential: number;
  icp_profile: string;
  notes: string | null;
};

function clamp0to100(n: unknown): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeSegment(raw: unknown): DraftSegment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!name) return null;
  const pnf = clamp0to100(o.pnf_score);
  const pains = Array.isArray(o.pain_points)
    ? o.pain_points.map((p) => String(p).trim()).filter(Boolean).slice(0, 12)
    : [];
  return {
    name,
    pnf_score: pnf,
    pain_points: pains.length ? pains : ["—"],
    urgency: clamp0to100(o.urgency ?? pnf),
    budget_fit: clamp0to100(o.budget_fit ?? pnf),
    acv_potential: clamp0to100(o.acv_potential ?? pnf),
    retention_potential: clamp0to100(o.retention_potential ?? pnf),
    icp_profile: typeof o.icp_profile === "string" ? o.icp_profile.trim() : "",
    notes: typeof o.notes === "string" && o.notes.trim() ? o.notes.trim() : null
  };
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as {
      mode?: "append" | "replace";
      segments?: unknown[];
    };

    const mode = body.mode === "replace" ? "replace" : "append";
    const rawList = Array.isArray(body.segments) ? body.segments : [];
    if (rawList.length === 0) {
      return NextResponse.json({ error: "No segments to save." }, { status: 400 });
    }
    if (rawList.length > 30) {
      return NextResponse.json({ error: "Too many segments (max 30)." }, { status: 400 });
    }

    const segments: DraftSegment[] = [];
    for (const r of rawList) {
      const s = normalizeSegment(r);
      if (s) segments.push(s);
    }
    if (segments.length === 0) {
      return NextResponse.json({ error: "Invalid segment data." }, { status: 400 });
    }

    if (mode === "replace") {
      const { error: delErr } = await supabase
        .from("segments")
        .delete()
        .eq("environment_id", ctx.environmentId);
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 400 });
      }
    }

    const rows = segments.map((s) => ({
      environment_id: ctx.environmentId,
      name: s.name,
      pnf_score: s.pnf_score,
      pain_points: s.pain_points,
      notes: s.notes,
      details: {
        urgency: s.urgency,
        budget_fit: s.budget_fit,
        acv_potential: s.acv_potential,
        retention_potential: s.retention_potential,
        icp_profile: s.icp_profile
      }
    }));

    const { error: insErr } = await supabase.from("segments").insert(rows);
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, inserted: segments.length, mode });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
