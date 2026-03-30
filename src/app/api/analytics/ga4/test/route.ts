import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { createGa4Client } from "@/lib/ga4";

type AnalyticsSettings = {
  ga4_property_id?: string;
};

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) {
      return NextResponse.json({ ok: false, error: "No product selected." }, { status: 400 });
    }

    const { data: settingsRow, error: settingsError } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", selected.environmentId)
      .eq("module", "analytics")
      .eq("key", "connections")
      .maybeSingle();
    if (settingsError) {
      return NextResponse.json({ ok: false, error: settingsError.message }, { status: 500 });
    }

    const settings = (settingsRow?.value_json ?? null) as AnalyticsSettings | null;
    const ga4PropertyId = (settings?.ga4_property_id ?? "").trim();
    if (!ga4PropertyId) {
      return NextResponse.json(
        {
          ok: false,
          error: "GA4 property ID is missing. Add it in Settings → Analytics first."
        },
        { status: 400 }
      );
    }

    const property = `properties/${ga4PropertyId}`;
    const ga4 = createGa4Client();

    await ga4.properties.runReport({
      property,
      requestBody: {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }],
        limit: "1"
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

