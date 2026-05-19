import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type AnalyticsSettings = {
  meta_ad_account?: string;
  meta_access_token?: string;
};

type MetaCampaignInsight = {
  campaign_name?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  conversions?: Array<{ action_type: string; value: string }> | string;
  ctr?: string;
  cpc?: string;
};

type MetaResponse = {
  data?: MetaCampaignInsight[];
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

function parseNum(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function parseConversions(
  v: MetaCampaignInsight["conversions"]
): number {
  if (!v) return 0;
  if (typeof v === "string") return parseNum(v);
  // Array form: sum all action values
  return v.reduce((sum, a) => sum + parseNum(a.value), 0);
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
    const accountId = (settings?.meta_ad_account ?? "").trim();
    const accessToken = (settings?.meta_access_token ?? "").trim();

    if (!accountId || !accessToken) {
      return NextResponse.json(
        {
          error: "Meta ad account ID and access token required.",
          code: "NOT_CONFIGURED"
        },
        { status: 400 }
      );
    }

    // Strip leading "act_" if present — the API endpoint already adds it.
    const numericId = accountId.replace(/^act_/, "").trim();

    const params = new URLSearchParams({
      fields: "campaign_name,impressions,clicks,spend,conversions,ctr,cpc",
      date_preset: "last_30d",
      level: "campaign",
      access_token: accessToken
    });

    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/act_${numericId}/insights?${params.toString()}`
    );

    const metaData = (await metaRes.json()) as MetaResponse;

    if (!metaRes.ok || metaData.error) {
      const msg =
        metaData.error?.message ?? `HTTP ${metaRes.status}`;
      return NextResponse.json(
        { error: `Meta API error: ${msg}` },
        { status: 502 }
      );
    }

    const rows = metaData.data ?? [];

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

    for (const row of rows) {
      const impressions = parseNum(row.impressions);
      const clicks = parseNum(row.clicks);
      const spend = parseNum(row.spend);
      const conversions = parseConversions(row.conversions);

      totalImpressions += impressions;
      totalClicks += clicks;
      totalSpend += spend;
      totalConversions += conversions;

      campaigns.push({
        name: row.campaign_name ?? "Unknown campaign",
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
    const message = e instanceof Error ? e.message : "Unknown Meta error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
