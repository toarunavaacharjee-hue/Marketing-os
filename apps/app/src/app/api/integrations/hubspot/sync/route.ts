import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

export const runtime = "nodejs";
export const maxDuration = 60;

type HubSpotContactProperties = {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  jobtitle?: string | null;
  company?: string | null;
  industry?: string | null;
  hs_lead_status?: string | null;
  createdate?: string | null;
};

type HubSpotDealProperties = {
  dealname?: string | null;
  dealstage?: string | null;
  amount?: string | null;
  closedate?: string | null;
  industry?: string | null;
  hs_deal_stage_probability?: string | null;
};

type HubSpotContact = {
  id: string;
  properties: HubSpotContactProperties;
};

type HubSpotDeal = {
  id: string;
  properties: HubSpotDealProperties;
};

type HubSpotApiResponse<T> = {
  results: T[];
  paging?: { next?: { after?: string } };
};

type HubSpotSnapshot = {
  synced_at: string;
  contacts_count: number;
  deals_count: number;
  top_industries: string[];
  deal_stages: Array<{ stage: string; count: number; total_value: number }>;
  avg_deal_value: number;
  contacts_sample: Array<{ name: string; title: string; company: string; industry: string }>;
  deals_sample: Array<{ name: string; stage: string; value: number; probability: number }>;
};

function topN<T>(
  items: T[],
  key: (item: T) => string | null | undefined,
  n: number
): string[] {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    if (k && k.trim()) {
      counts[k.trim()] = (counts[k.trim()] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export async function POST() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) {
      return NextResponse.json({ error: "No product/environment selected." }, { status: 400 });
    }
    const { environmentId } = selected;

    // Read integration settings
    const { data: settingsRow } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", "integrations")
      .eq("key", "connectors")
      .maybeSingle();

    const connectors = (settingsRow?.value_json ?? {}) as Record<string, { enabled?: boolean; token?: string; account_id?: string }>;
    const hubspot = connectors.hubspot ?? {};
    // token field is preferred; account_id is the legacy fallback from before the field rename
    const token = (hubspot.token ?? hubspot.account_id ?? "").trim();
    const enabled = Boolean(hubspot.enabled);

    if (!enabled || !token) {
      return NextResponse.json(
        {
          error: "HubSpot not configured. Enable it in Settings → Integrations.",
          code: "NOT_CONFIGURED"
        },
        { status: 400 }
      );
    }

    // Fetch contacts
    const contactsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,email,jobtitle,company,industry,hs_lead_status,createdate",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    if (!contactsRes.ok) {
      const body = await contactsRes.text();
      return NextResponse.json(
        { error: `HubSpot Contacts API error (${contactsRes.status}): ${body}` },
        { status: 502 }
      );
    }
    const contactsData = (await contactsRes.json()) as HubSpotApiResponse<HubSpotContact>;
    const contacts = contactsData.results ?? [];

    // Fetch deals
    const dealsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=dealname,dealstage,amount,closedate,industry,hs_deal_stage_probability",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    if (!dealsRes.ok) {
      const body = await dealsRes.text();
      return NextResponse.json(
        { error: `HubSpot Deals API error (${dealsRes.status}): ${body}` },
        { status: 502 }
      );
    }
    const dealsData = (await dealsRes.json()) as HubSpotApiResponse<HubSpotDeal>;
    const deals = dealsData.results ?? [];

    // Gather industries from both contacts and deals
    const allIndustrySources = [
      ...contacts.map((c) => c.properties.industry),
      ...deals.map((d) => d.properties.industry)
    ];
    const topIndustries = topN(allIndustrySources, (x) => x, 5);

    // Build deal stages summary
    const stageMap: Record<string, { count: number; total_value: number }> = {};
    for (const deal of deals) {
      const stage = (deal.properties.dealstage ?? "unknown").trim();
      const value = parseFloat(deal.properties.amount ?? "0") || 0;
      if (!stageMap[stage]) stageMap[stage] = { count: 0, total_value: 0 };
      stageMap[stage].count += 1;
      stageMap[stage].total_value += value;
    }
    const dealStages = Object.entries(stageMap).map(([stage, v]) => ({
      stage,
      count: v.count,
      total_value: Math.round(v.total_value * 100) / 100
    }));

    const totalDealValue = deals.reduce((sum, d) => sum + (parseFloat(d.properties.amount ?? "0") || 0), 0);
    const avgDealValue = deals.length > 0 ? Math.round((totalDealValue / deals.length) * 100) / 100 : 0;

    const contactsSample = contacts.slice(0, 20).map((c) => ({
      name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(" ") || "Unknown",
      title: c.properties.jobtitle ?? "",
      company: c.properties.company ?? "",
      industry: c.properties.industry ?? ""
    }));

    const dealsSample = deals.slice(0, 20).map((d) => ({
      name: d.properties.dealname ?? "Unnamed deal",
      stage: d.properties.dealstage ?? "",
      value: parseFloat(d.properties.amount ?? "0") || 0,
      probability: parseFloat(d.properties.hs_deal_stage_probability ?? "0") || 0
    }));

    const snapshot: HubSpotSnapshot = {
      synced_at: new Date().toISOString(),
      contacts_count: contacts.length,
      deals_count: deals.length,
      top_industries: topIndustries,
      deal_stages: dealStages,
      avg_deal_value: avgDealValue,
      contacts_sample: contactsSample,
      deals_sample: dealsSample
    };

    // Save snapshot to module_settings
    const { error: saveErr } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: "market_research",
      key: "hubspot_snapshot",
      value_json: snapshot
    });
    if (saveErr) {
      return NextResponse.json({ error: saveErr.message }, { status: 500 });
    }

    // Merge new companies into competitor list from deals
    const dealCompanies = deals
      .map((d) => d.properties.dealname ?? "")
      .filter(Boolean)
      .slice(0, 10);

    if (dealCompanies.length > 0) {
      const { data: existingComp } = await supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", environmentId)
        .eq("module", "market_research")
        .eq("key", "competitors")
        .maybeSingle();

      const existing = (existingComp?.value_json ?? []) as Array<{
        name: string;
        url?: string;
        description?: string;
        source?: string;
      }>;
      const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));

      const newEntries = dealCompanies
        .filter((name) => !existingNames.has(name.toLowerCase()))
        .map((name) => ({ name, url: "", description: "", source: "hubspot_deals" }));

      if (newEntries.length > 0) {
        await supabase.from("module_settings").upsert({
          environment_id: environmentId,
          module: "market_research",
          key: "competitors",
          value_json: [...existing, ...newEntries]
        });
      }
    }

    return NextResponse.json(snapshot);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
