import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type EventRow = {
  prepPct?: number;
  tasks?: unknown[];
  eventDate?: string;
};

type EventsValue = {
  events?: EventRow[];
  pastNotes?: string;
};

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });
    const { environmentId } = selected;

    const { data, error: qErr } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "events")
      .eq("key", "workspace")
      .maybeSingle();

    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

    if (!data?.value_json || typeof data.value_json !== "object") {
      return NextResponse.json({ total: 0, avgPrepPct: 0, upcomingCount: 0 });
    }

    const value = data.value_json as EventsValue;
    const events: EventRow[] = Array.isArray(value.events) ? value.events : [];

    const total = events.length;

    const avgPrepPct =
      total === 0
        ? 0
        : Math.round(
            events.reduce((sum, ev) => {
              const pct = typeof ev.prepPct === "number" && !Number.isNaN(ev.prepPct) ? ev.prepPct : 0;
              return sum + Math.max(0, Math.min(100, pct));
            }, 0) / total
          );

    const today = new Date().toISOString().slice(0, 10);
    const upcomingCount = events.filter((ev) => {
      const d = typeof ev.eventDate === "string" ? ev.eventDate.trim() : "";
      if (!d) return false;
      // eventDate may be a freeform string like "Feb 19–20, 2025" or "2025-02-19"
      // Try to parse as a date; if unparseable treat as not upcoming
      const parsed = new Date(d);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.toISOString().slice(0, 10) >= today;
    }).length;

    return NextResponse.json({ total, avgPrepPct, upcomingCount });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
