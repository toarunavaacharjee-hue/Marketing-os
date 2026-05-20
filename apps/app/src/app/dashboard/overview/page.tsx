import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DailyDigestCard } from "@/app/dashboard/DailyDigestCard";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { PMM_JOURNEY, type JourneyPhase } from "@/lib/pmmModuleFlow";
import { POSITIONING_KEY, POSITIONING_MODULE } from "@/lib/positioningStudio";
import { aggregateWorkFromSettings } from "@/lib/aggregateWorkspaceWork";

export const dynamic = "force-dynamic";

type ProductProfileRow = {
  name: string | null;
  website_url: string | null;
  category: string | null;
  icp_summary: string | null;
  positioning_summary: string | null;
  g2_review_url: string | null;
  capterra_review_url: string | null;
  news_rss_url: string | null;
  news_keywords: string | null;
};

export default async function OverviewPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single()
    : { data: null as { name?: string | null } | null };

  const name = profile?.name ?? "there";

  const now = new Date();
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long" });
  const monthDayLabel = now.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric"
  });

  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  let connectors: {
    ga4?: { enabled?: boolean };
    hubspot?: { enabled?: boolean };
    linkedin_ads?: { enabled?: boolean };
    meta_ads?: { enabled?: boolean };
  } | null = null;
  if (ctx?.environmentId) {
    const { data } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", "integrations")
      .eq("key", "connectors")
      .maybeSingle();
    connectors = (data?.value_json ?? null) as typeof connectors;
  }

  let productProfile: ProductProfileRow | null = null;
  let competitorCount = 0;

  if (ctx?.productId) {
    const { data: prodRow } = await supabase
      .from("products")
      .select(
        "name,website_url,category,icp_summary,positioning_summary,g2_review_url,capterra_review_url,news_rss_url,news_keywords"
      )
      .eq("id", ctx.productId)
      .maybeSingle();

    productProfile = (prodRow ?? null) as ProductProfileRow | null;

    const { count } = await supabase
      .from("product_competitors")
      .select("id", { count: "exact", head: true })
      .eq("product_id", ctx.productId);
    competitorCount = count ?? 0;
  }

  let segmentCount = 0;
  let campaignCardCount = 0;
  let contentQueueCount = 0;
  let allModuleRows: { module: string; key: string; value_json: unknown }[] = [];

  if (ctx?.environmentId) {
    const { count: segN } = await supabase
      .from("segments")
      .select("id", { count: "exact", head: true })
      .eq("environment_id", ctx.environmentId);
    segmentCount = segN ?? 0;

    const { data: kanRow } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", "campaigns")
      .eq("key", "kanban")
      .maybeSingle();
    const cols = (kanRow?.value_json as { columns?: Record<string, unknown[]> } | null)?.columns;
    if (cols && typeof cols === "object") {
      for (const arr of Object.values(cols)) {
        if (Array.isArray(arr)) campaignCardCount += arr.length;
      }
    }

    const { data: contentRow } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", ctx.environmentId)
      .eq("module", "content_studio")
      .eq("key", "workspace")
      .maybeSingle();
    const queue = (contentRow?.value_json as { queue?: unknown[] } | null)?.queue;
    contentQueueCount = Array.isArray(queue) ? queue.length : 0;

    const { data: allRows } = await supabase
      .from("module_settings")
      .select("module, key, value_json")
      .eq("environment_id", ctx.environmentId);
    allModuleRows = (allRows ?? []) as typeof allModuleRows;
  }

  const t = (s: string | null | undefined) => (s ?? "").trim();
  const p = productProfile;

  const productNarrativeOk =
    !!t(p?.name) &&
    !!t(p?.website_url) &&
    !!t(p?.category) &&
    !!t(p?.icp_summary) &&
    !!t(p?.positioning_summary);
  const competitorsOk = competitorCount > 0;
  const newsRssOk = !!t(p?.news_rss_url);
  const reviewUrlsOk = !!(t(p?.g2_review_url) || t(p?.capterra_review_url));
  const scanPrereqsOk =
    productNarrativeOk && competitorsOk && newsRssOk && reviewUrlsOk;
  const segmentsOk = segmentCount > 0;

  let positioningCanvasOk = false;
  let completedScanCount = 0;
  let ga4Configured = false;

  if (ctx?.environmentId && ctx.productId) {
    const [posRes, scanRes, analyticsRes] = await Promise.all([
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", ctx.environmentId)
        .eq("module", POSITIONING_MODULE)
        .eq("key", POSITIONING_KEY)
        .maybeSingle(),
      supabase
        .from("research_scans")
        .select("id", { count: "exact", head: true })
        .eq("environment_id", ctx.environmentId)
        .eq("product_id", ctx.productId)
        .eq("status", "completed"),
      supabase
        .from("module_settings")
        .select("value_json")
        .eq("environment_id", ctx.environmentId)
        .eq("module", "analytics")
        .eq("key", "connections")
        .maybeSingle()
    ]);

    const doc = (posRes.data?.value_json as { doc?: Record<string, string> } | null)?.doc;
    positioningCanvasOk = Boolean(t(doc?.category) || t(doc?.target) || t(doc?.problem));
    completedScanCount = scanRes.count ?? 0;
    const ga4 = (analyticsRes.data?.value_json as { ga4_property_id?: string } | null)?.ga4_property_id;
    ga4Configured = Boolean(t(ga4));
  }

  const scanCompletedOk = completedScanCount > 0;

  const healthItems: HealthCheckItem[] = [
    {
      id: "narrative",
      label: "Product narrative",
      detail: "Name, website, category, ICP summary, positioning summary",
      ok: productNarrativeOk,
      fixHref: "/dashboard/settings/product",
      fixLabel: "Product profile"
    },
    {
      id: "competitors",
      label: "Competitors",
      detail: "At least one competitor URL (required for Market Research scan)",
      ok: competitorsOk,
      fixHref: "/dashboard/settings/product",
      fixLabel: "Add competitors"
    },
    {
      id: "rss",
      label: "Industry news RSS",
      detail: "Feed URL for scan + news context",
      ok: newsRssOk,
      fixHref: "/dashboard/settings/product",
      fixLabel: "Product profile"
    },
    {
      id: "reviews",
      label: "G2 or Capterra",
      detail: "At least one review page URL",
      ok: reviewUrlsOk,
      fixHref: "/dashboard/settings/product",
      fixLabel: "Product profile"
    },
    {
      id: "segments",
      label: "ICP segments",
      detail: "At least one segment for this product environment",
      ok: segmentsOk,
      fixHref: "/dashboard/icp-segmentation",
      fixLabel: "ICP Segmentation"
    },
    {
      id: "positioning",
      label: "Positioning Studio",
      detail: "Canvas saved (category / target / problem filled)",
      ok: positioningCanvasOk,
      fixHref: "/dashboard/positioning-studio",
      fixLabel: "Positioning Studio"
    },
    {
      id: "scan",
      label: "Market Research scan",
      detail: "At least one completed AI scan",
      ok: scanCompletedOk,
      fixHref: "/dashboard/market-research",
      fixLabel: "Market Research"
    },
    {
      id: "ga4",
      label: "Analytics (GA4)",
      detail: "GA4 property ID in module settings",
      ok: ga4Configured,
      fixHref: "/dashboard/settings/analytics",
      fixLabel: "Analytics settings"
    }
  ];

  const healthDone = healthItems.filter((x) => x.ok).length;
  const healthTotal = healthItems.length;

  // Real overdue items from module_settings
  const nowTs = Date.now();
  const allWorkItems = aggregateWorkFromSettings(allModuleRows);
  const overdueItems = allWorkItems
    .filter((i) => !i.done && i.dueTs != null && i.dueTs < nowTs)
    .slice(0, 4);
  const upcomingItems = allWorkItems
    .filter((i) => !i.done && i.dueTs != null && i.dueTs >= nowTs && i.dueTs <= nowTs + 7 * 24 * 60 * 60 * 1000)
    .sort((a, b) => (a.dueTs ?? 0) - (b.dueTs ?? 0))
    .slice(0, 4);

  return (
    <div className="pb-2">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1
            className="text-[28px] font-extrabold tracking-[-0.5px] text-heading"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1.1 }}
          >
            Good morning, {name} <span className="text-accent2">⚡</span>
          </h1>
          <div className="mt-2 text-[13px] text-text2">
            {dateLabel}, {monthDayLabel} · {campaignCardCount} campaign cards · {segmentCount} ICP segments ·{" "}
            {contentQueueCount} queued content pieces
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="#daily-digest"
            className="inline-flex items-center gap-2 rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-[13px] font-semibold text-text transition hover:bg-surface3 hover:border-border2"
          >
            📋 <span>Daily Brief</span>
          </a>
          <Link
            href="/dashboard/help"
            className="inline-flex items-center gap-2 rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-[13px] font-semibold text-text transition hover:bg-surface3 hover:border-border2"
          >
            📖 <span>Help</span>
          </Link>
          <Link
            href="/dashboard/copilot"
            className="inline-flex items-center gap-2 rounded-[var(--radius2)] bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-primary-dark"
          >
            🤖 <span>Ask AI</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-[14px] md:grid-cols-4">
        <Kpi title="Campaigns (kanban)" value={String(campaignCardCount)} delta="All columns" tone="neutral" />
        <Kpi title="Content queue" value={String(contentQueueCount)} delta="Content Studio" tone="neutral" />
        <Kpi title="ICP segments" value={String(segmentCount)} delta="ICP Segmentation" tone="neutral" />
        <Kpi title="Competitors" value={String(competitorCount)} delta="Product profile" tone="neutral" />
      </div>

      <div id="workspace-health">
        <WorkspaceHealthChecklist
          done={healthDone}
          total={healthTotal}
          items={healthItems}
          scanPrereqsOk={scanPrereqsOk}
          scanCompletedOk={scanCompletedOk}
        />
      </div>

      <IntegrationStatus connectors={connectors} />
      <PmmJourneyMap />
      <ProductOverview
        product={productProfile}
        competitorCount={competitorCount}
      />

      <div className="mt-5 rounded-[var(--radius)] border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
              🚀 Getting started
            </div>
            <div className="mt-1 text-[11px] text-text2">
              Apply playbook templates and run your first workflows (segments → positioning → artifacts).
            </div>
          </div>
          <Link
            href="/dashboard/getting-started"
            className="inline-flex rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
          >
            Open Getting started
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <NeedsAttentionSection items={overdueItems} />
          <UpcomingThisWeek items={upcomingItems} />
        </div>

        <div className="space-y-4">
          <div id="daily-digest">
            <DailyDigestCard />
          </div>
          {ga4Configured ? null : <AnalyticsConnectCallout />}
        </div>
      </div>
    </div>
  );
}

function NeedsAttentionSection({
  items
}: {
  items: Array<{ id: string; title: string; sourceLabel: string; due?: string; href: string }>;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
            🔴 Overdue items
          </div>
          <div className="mt-1 text-[11px] text-text2">
            Tasks with a past due date across GTM, Events, Content, and Campaigns.
          </div>
        </div>
        <Link
          href="/dashboard/work"
          className="shrink-0 rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-1.5 text-[11px] font-semibold text-text hover:bg-surface3"
        >
          View all in Workbench →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-[var(--radius2)] border border-[rgba(52,211,153,0.35)] bg-[rgba(52,211,153,0.1)] px-4 py-3 text-[12px] text-green">
          No overdue items. You are on track.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius2)] border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.06)] px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{item.title}</div>
                <div className="mt-0.5 text-[11px] text-text2">
                  {item.sourceLabel} · Due {item.due ?? "—"}
                </div>
              </div>
              <Link
                href={item.href}
                className="shrink-0 rounded-[var(--radius2)] bg-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-dark"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpcomingThisWeek({
  items
}: {
  items: Array<{ id: string; title: string; sourceLabel: string; due?: string; href: string }>;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
            📅 Due this week
          </div>
          <div className="mt-1 text-[11px] text-text2">
            Items due in the next 7 days across all modules.
          </div>
        </div>
        <Link
          href="/dashboard/work"
          className="shrink-0 rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-1.5 text-[11px] font-semibold text-text hover:bg-surface3"
        >
          Full Workbench →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 text-[12px] text-text2">
          Nothing due this week — or no due dates set yet.{" "}
          <Link href="/dashboard/work" className="text-accent hover:underline">
            See all work in Workbench →
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">{item.title}</div>
                <div className="mt-0.5 text-[11px] text-text2">
                  {item.sourceLabel} · Due {item.due ?? "—"}
                </div>
              </div>
              <Link
                href={item.href}
                className="shrink-0 rounded-[var(--radius2)] border border-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-text hover:bg-surface3"
              >
                Open
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalyticsConnectCallout() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
        📊 Connect Analytics
      </div>
      <div className="mt-1 text-[11px] text-text2">
        Link GA4, LinkedIn Ads, and Meta Ads to see live performance data across your campaigns and content.
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/dashboard/settings/integrations"
          className="inline-flex items-center gap-2 rounded-[var(--radius2)] bg-accent px-4 py-2 text-[12px] font-semibold text-white hover:bg-primary-dark"
        >
          Connect integrations →
        </Link>
        <Link
          href="/dashboard/analytics"
          className="inline-flex items-center gap-2 rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-[12px] font-semibold text-text hover:bg-surface3"
        >
          Open Analytics
        </Link>
      </div>
    </div>
  );
}

function ProductOverview({
  product,
  competitorCount
}: {
  product: {
    name: string | null;
    website_url: string | null;
    category: string | null;
    icp_summary: string | null;
    positioning_summary: string | null;
    g2_review_url: string | null;
    capterra_review_url: string | null;
    news_rss_url: string | null;
    news_keywords: string | null;
  } | null;
  competitorCount: number;
}) {
  return (
    <div className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-text">Product and Web Presence</div>
          <div className="mt-1 text-xs text-text2">
            Categorized details used by Market Research and internet monitoring.
          </div>
        </div>
        <Link
          href="/dashboard/settings/product"
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
        >
          Edit product details
        </Link>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <InfoBlock title="Product">
          <InfoRow
            label="Name"
            value={product?.name || "Not set"}
            status={product?.name ? "ok" : "missing"}
          />
          <InfoRow
            label="Category"
            value={product?.category || "Not set"}
            status={product?.category ? "ok" : "missing"}
          />
          <InfoRow
            label="Competitors"
            value={`${competitorCount}`}
            status={competitorCount > 0 ? "ok" : "missing"}
          />
        </InfoBlock>

        <InfoBlock title="Website and Positioning">
          <InfoRow
            label="Website"
            value={product?.website_url || "Not set"}
            status={product?.website_url ? "ok" : "missing"}
          />
          <InfoRow
            label="ICP summary"
            value={product?.icp_summary || "Not set"}
            clamp
            status={product?.icp_summary ? "ok" : "missing"}
          />
          <InfoRow
            label="Positioning"
            value={product?.positioning_summary || "Not set"}
            clamp
            status={product?.positioning_summary ? "ok" : "missing"}
          />
        </InfoBlock>

        <InfoBlock title="Internet Sources">
          <InfoRow
            label="Industry news (RSS)"
            value={product?.news_rss_url || "Not configured"}
            status={product?.news_rss_url ? "ok" : "missing"}
          />
          <InfoRow
            label="News keywords"
            value={product?.news_keywords || "All feed items"}
            status="ok"
          />
          <InfoRow
            label="Review sites"
            value={
              product?.g2_review_url || product?.capterra_review_url
                ? [product?.g2_review_url, product?.capterra_review_url]
                    .filter(Boolean)
                    .join(" | ")
                : "Not configured"
            }
            clamp
            status={
              product?.g2_review_url || product?.capterra_review_url
                ? "ok"
                : "missing"
            }
          />
        </InfoBlock>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius2)] border border-border bg-surface2 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.5px] text-text3">
        {title}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  clamp = false,
  status = "ok"
}: {
  label: string;
  value: string;
  clamp?: boolean;
  status?: "ok" | "missing";
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] text-text3">{label}</div>
        <StatusChip status={status} />
      </div>
      <div
        className={`text-[12px] text-text break-all ${clamp ? "max-h-[3rem] overflow-hidden" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: "ok" | "missing" }) {
  return status === "ok" ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(52,211,153,0.35)] bg-[rgba(52,211,153,0.12)] px-2 py-0.5 text-[10px] font-semibold text-green">
      <span className="h-1.5 w-1.5 rounded-full bg-green" />
      Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.12)] px-2 py-0.5 text-[10px] font-semibold text-red">
      <span className="h-1.5 w-1.5 rounded-full bg-red" />
      Missing
    </span>
  );
}

type HealthCheckItem = {
  id: string;
  label: string;
  detail: string;
  ok: boolean;
  fixHref: string;
  fixLabel: string;
};

function WorkspaceHealthChecklist({
  done,
  total,
  items,
  scanPrereqsOk,
  scanCompletedOk
}: {
  done: number;
  total: number;
  items: HealthCheckItem[];
  scanPrereqsOk: boolean;
  scanCompletedOk: boolean;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const allGreen = done === total;

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-[var(--font-heading)] text-[15px] font-bold text-text">
            Workspace health
          </div>
          <div className="mt-1 max-w-2xl text-[12px] leading-5 text-text2">
            Live checks for the <span className="text-text">selected product</span>. Matches what{" "}
            <Link href="/dashboard/market-research" className="text-accent hover:underline">
              Market Research → Run AI Scan
            </Link>{" "}
            requires, plus segments, positioning canvas, and GA4 for reporting.
          </div>
        </div>
        <div className="text-right">
          <div className="font-[var(--font-heading)] text-[28px] font-extrabold tabular-nums text-text">
            {done}/{total}
          </div>
          <div className="text-[11px] font-semibold text-text2">{pct}% complete</div>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface2">
        <div
          className={`h-full rounded-full transition-all ${allGreen ? "bg-green" : "bg-accent2"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {scanPrereqsOk && !scanCompletedOk ? (
        <div className="mt-4 rounded-[var(--radius2)] border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.1)] px-4 py-3 text-[12px] text-text">
          <span className="font-semibold text-yellow">Ready to scan.</span> Product profile meets run requirements.{" "}
          <Link href="/dashboard/market-research" className="font-semibold text-accent hover:underline">
            Run your first AI scan →
          </Link>
        </div>
      ) : null}

      {allGreen ? (
        <div className="mt-4 rounded-[var(--radius2)] border border-[rgba(52,211,153,0.35)] bg-[rgba(52,211,153,0.1)] px-4 py-3 text-[12px] text-green">
          All checks passed for this product. You have a connected narrative from profile → segments → positioning →
          research → analytics.
        </div>
      ) : null}

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  item.ok
                    ? "bg-[rgba(52,211,153,0.2)] text-green"
                    : "bg-[rgba(248,113,113,0.15)] text-red"
                }`}
                aria-hidden
              >
                {item.ok ? "✓" : "!"}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-text">{item.label}</div>
                <div className="mt-0.5 text-[11px] leading-4 text-text2">{item.detail}</div>
              </div>
            </div>
            {!item.ok ? (
              <Link
                href={item.fixHref}
                className="shrink-0 rounded-[var(--radius2)] bg-accent px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-dark"
              >
                {item.fixLabel}
              </Link>
            ) : (
              <span className="shrink-0 text-[11px] font-semibold text-text3">Done</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IntegrationStatus({
  connectors
}: {
  connectors: {
    ga4?: { enabled?: boolean };
    hubspot?: { enabled?: boolean };
    linkedin_ads?: { enabled?: boolean };
    meta_ads?: { enabled?: boolean };
  } | null;
}) {
  const items = [
    { label: "GA4", on: Boolean(connectors?.ga4?.enabled) },
    { label: "HubSpot", on: Boolean(connectors?.hubspot?.enabled) },
    { label: "LinkedIn Ads", on: Boolean(connectors?.linkedin_ads?.enabled) },
    { label: "Meta Ads", on: Boolean(connectors?.meta_ads?.enabled) }
  ];

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-text">Integration status</div>
        <Link
          href="/dashboard/settings/integrations"
          className="rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
        >
          Configure integrations
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((i) => (
          <div
            key={i.label}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface2 px-3 py-1.5 text-xs text-text2"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                i.on ? "bg-green" : "bg-white/20"
              }`}
            />
            <span className="text-text">{i.label}</span>
            <span>{i.on ? "Connected" : "Not connected"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  delta,
  tone = "up"
}: {
  title: string;
  value: string;
  delta: string;
  tone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-[18px]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text3">
        {title}
      </div>
      <div className="mt-2 font-[var(--font-heading)] text-[28px] font-extrabold leading-none text-text">
        {value}
      </div>
      <div
        className={`mt-1 text-[12px] font-semibold ${
          tone === "up" ? "text-green" : tone === "down" ? "text-red" : "text-text2"
        }`}
      >
        {delta}
      </div>
    </div>
  );
}

function PmmJourneyMap() {
  const order: JourneyPhase[] = ["Strategy", "Planning", "Creation", "Intelligence", "AI"];
  const blurb: Record<JourneyPhase, string> = {
    Strategy: "Truth about market & buyer — feeds everything downstream.",
    Planning: "What ships, when, and with which stakeholders.",
    Creation: "Assets and surfaces your team publishes.",
    Intelligence: "Performance, competitors, voice of customer, sales.",
    AI: "Ask across context; does not replace the spine above."
  };

  return (
    <div className="mt-4 rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-[var(--font-heading)] text-[15px] font-bold text-text">
            PMM workspace — single spine per product
          </div>
          <div className="mt-1 max-w-3xl text-[12px] leading-5 text-text2">
            Each module reads or writes the same product context (profile, segments, scans, assets). Follow the row
            left-to-right for strategy → launch → measurement. Settings hold foundations; Copilot sits on top for
            questions.
          </div>
        </div>
        <Link
          href="/dashboard/settings/product"
          className="shrink-0 rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-[11px] font-semibold text-text hover:bg-surface3"
        >
          Edit product context
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {order.map((phase) => (
          <div
            key={phase}
            className="rounded-[var(--radius2)] border border-border bg-surface2 p-3"
          >
            <div className="text-[10px] font-bold uppercase tracking-wide text-accent2">{phase}</div>
            <div className="mt-1 text-[11px] leading-4 text-text3">{blurb[phase]}</div>
            <ul className="mt-2 space-y-1.5">
              {PMM_JOURNEY.filter((s) => s.phase === phase).map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    className="text-[12px] font-medium text-text hover:text-accent2 hover:underline"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
