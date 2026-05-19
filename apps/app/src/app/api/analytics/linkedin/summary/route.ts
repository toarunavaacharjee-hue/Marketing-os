import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type AnalyticsSettings = {
  linkedin_ad_account?: string;
  linkedin_access_token?: string;
};

type LinkedInAnalyticsElement = {
  impressions?: number;
  clicks?: number;
  costInLocalCurrency?: string;
  externalWebsiteConversions?: number;
  pivotValues?: string[];
};

type LinkedInResponse = {
  elements?: LinkedInAnalyticsElement[];
  message?: string;
  status?: number;
};

function getDateParts(date: Date): { year: number; month: number; day: number } {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

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
    const accountId = (settings?.linkedin_ad_account ?? "").trim();
    const accessToken = (settings?.linkedin_access_token ?? "").trim();

    if (!accountId || !accessToken) {
      return NextResponse.json(
        {
          error:
            "LinkedIn account ID and access token required. Configure in Settings → Analytics.",
          code: "NOT_CONFIGURED"
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);

    const startParts = getDateParts(start);
    const endParts = getDateParts(now);

    // Normalize account ID — strip urn prefix if user pasted the full URN,
    // or use as-is if numeric.
    const numericId = accountId.replace(/^urn:li:sponsoredAccount:/, "").trim();

    const params = new URLSearchParams({
      q: "analytics",
      "dateRange.start.year": String(startParts.year),
      "dateRange.start.month": String(startParts.month),
      "dateRange.start.day": String(startParts.day),
      "dateRange.end.year": String(endParts.year),
      "dateRange.end.month": String(endParts.month),
      "dateRange.end.day": String(endParts.day),
      pivot: "CAMPAIGN",
      "accounts": `List(urn:li:sponsoredAccount:${numericId})`,
      fields:
        "impressions,clicks,costInLocalCurrency,externalWebsiteConversions,dateRange,pivotValues"
    });

    const liRes = await fetch(
      `https://api.linkedin.com/v2/adAnalytics?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    const liData = (await liRes.json()) as LinkedInResponse;

    if (!liRes.ok) {
      const msg = liData.message ?? `HTTP ${liRes.status}`;
      return NextResponse.json(
        { error: `LinkedIn API error: ${msg}` },
        { status: 502 }
      );
    }

    const elements = liData.elements ?? [];

    // Aggregate totals
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalConversions = 0;

    const campaigns: Array<{
      name: string;
      impressions: number;
      clicks: number;
      spend: number;
      conversions: number;
    }> = [];

    for (const el of elements) {
      const impressions = el.impressions ?? 0;
      const clicks = el.clicks ?? 0;
      const spend = parseFloat(el.costInLocalCurrency ?? "0");
      const conversions = el.externalWebsiteConversions ?? 0;

      totalImpressions += impressions;
      totalClicks += clicks;
      totalSpend += spend;
      totalConversions += conversions;

      const campaignName =
        el.pivotValues?.[0] ?? "Unknown campaign";

      campaigns.push({
        name: campaignName,
        impressions,
        clicks,
        spend,
        conversions
      });
    }

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    return NextResponse.json({
      window: "Last 30 days",
      totals: {
        impressions: totalImpressions,
        clicks: totalClicks,
        spend: totalSpend,
        conversions: totalConversions,
        ctr,
        cpc
      },
      campaigns
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown LinkedIn error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
