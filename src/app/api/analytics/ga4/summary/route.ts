import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { createGa4Client } from "@/lib/ga4";

type AnalyticsSettings = {
  ga4_property_id?: string;
};

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) {
      return NextResponse.json({ error: "No product selected." }, { status: 400 });
    }

    const { data: settingsRow, error: settingsError } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", selected.environmentId)
      .eq("module", "analytics")
      .eq("key", "connections")
      .maybeSingle();
    if (settingsError) {
      return NextResponse.json({ error: settingsError.message }, { status: 500 });
    }

    const settings = (settingsRow?.value_json ?? null) as AnalyticsSettings | null;
    const ga4PropertyId = (settings?.ga4_property_id ?? "").trim();
    if (!ga4PropertyId) {
      return NextResponse.json(
        {
          error:
            "GA4 property ID is missing. Add it in Settings → Analytics before loading GA stats."
        },
        { status: 400 }
      );
    }

    const property = `properties/${ga4PropertyId}`;
    const ga4 = createGa4Client();

    const [summaryRes, pagesRes] = await Promise.all([
      ga4.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          metrics: [
            { name: "activeUsers" },
            { name: "newUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "engagementRate" },
            { name: "bounceRate" },
            { name: "conversions" }
          ]
        }
      }),
      ga4.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: "8"
        }
      })
    ]);

    const summaryRow = summaryRes.data.rows?.[0]?.metricValues ?? [];
    const getMetric = (idx: number) => Number(summaryRow[idx]?.value ?? 0);

    const sessions = getMetric(2);
    const conversions = getMetric(6);
    const conversionRate = sessions > 0 ? (conversions / sessions) * 100 : 0;

    const topPages =
      pagesRes.data.rows?.map((r) => ({
        path: r.dimensionValues?.[0]?.value ?? "/",
        views: Number(r.metricValues?.[0]?.value ?? 0)
      })) ?? [];

    return NextResponse.json({
      window: "Last 30 days",
      metrics: {
        activeUsers: getMetric(0),
        newUsers: getMetric(1),
        sessions,
        pageViews: getMetric(3),
        engagementRate: getMetric(4),
        bounceRate: getMetric(5),
        conversions,
        conversionRate
      },
      topPages
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown GA4 error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

