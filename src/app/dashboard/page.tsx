import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DailyDigestCard } from "@/app/dashboard/DailyDigestCard";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

export default function DashboardIndex() {
  return <CommandCentrePage />;
}

async function CommandCentrePage() {
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

  return (
    <div className="pb-2">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div
            className="text-[28px] font-extrabold tracking-[-0.5px] text-text"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1.1 }}
          >
            Good morning, {name} <span className="text-accent2">⚡</span>
          </div>
          <div className="mt-2 text-[13px] text-text2">
            {dateLabel}, {monthDayLabel} · 14 active campaigns · 3 items need
            attention
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#daily-digest"
            className="inline-flex items-center gap-2 rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-[13px] font-semibold text-text transition hover:bg-surface3 hover:border-border2"
          >
            📋 <span>Daily Brief</span>
          </a>
          <Link
            href="/dashboard/copilot"
            className="inline-flex items-center gap-2 rounded-[var(--radius2)] bg-accent px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#5b52ee]"
          >
            🤖 <span>Ask AI</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-[14px] md:grid-cols-4">
        <Kpi title="Active Campaigns" value="14" delta="↑ 3 this week" tone="up" />
        <Kpi title="Content Pieces Due" value="7" delta="↓ 2 overdue" tone="down" />
        <Kpi title="Blended ROAS" value="3.8×" delta="↑ 0.4 vs last week" tone="up" />
        <Kpi title="Pipeline Influence" value="$2.1M" delta="↑ 12% MTD" tone="up" />
      </div>

      <IntegrationStatus connectors={connectors} />

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <NeedsAttention />
          <ThisWeek />
        </div>

        <div className="space-y-4">
          <div id="daily-digest">
            <DailyDigestCard />
          </div>
          <QuickMetrics />
        </div>
      </div>
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

function NeedsAttention() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
        🔴 Needs Attention
      </div>

      <div className="mt-3 space-y-3">
        <AttentionRow
          icon="⚠️"
          iconBg="rgba(248,113,113,0.15)"
          title="LinkedIn Ad creative fatigue detected"
          detail='Ad set "Enterprise Q1" CTR dropped 34% over 7 days. Creative refresh recommended.'
          actions={[
            { label: "View Analytics", href: "/dashboard/analytics" },
            { label: "Draft New Creative", href: "/dashboard/content-studio", primary: true }
          ]}
        />
        <AttentionRow
          icon="📅"
          iconBg="rgba(251,191,36,0.15)"
          title="SaaStr booth brief overdue by 2 days"
          detail="Event is in 18 days. Assign owner and brief the design team."
          actions={[{ label: "Open Events", href: "/dashboard/events", primary: true }]}
        />
        <AttentionRow
          icon="🌐"
          iconBg="rgba(248,113,113,0.15)"
          title="3 website pages are 90+ days stale"
          detail="Pricing, Integrations, and Enterprise pages need content refresh after Q4 product updates."
          actions={[{ label: "Review Pages", href: "/dashboard/website-pages" }]}
        />
      </div>
    </div>
  );
}

function AttentionRow({
  icon,
  iconBg,
  title,
  detail,
  actions
}: {
  icon: string;
  iconBg: string;
  title: string;
  detail: string;
  actions: Array<{ label: string; href: string; primary?: boolean }>;
}) {
  return (
    <div className="flex gap-3 rounded-[var(--radius)] border border-border bg-surface2 p-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[16px]"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="mt-1 text-[12px] leading-5 text-text2">{detail}</div>
        {actions.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className={`inline-flex items-center gap-2 rounded-[var(--radius2)] px-4 py-2 text-[12px] font-semibold transition ${
                  a.primary
                    ? "bg-accent text-white hover:bg-[#5b52ee]"
                    : "border border-border bg-surface text-text hover:bg-surface3 hover:border-border2"
                }`}
              >
                {a.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ThisWeek() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
        📅 This Week
      </div>

      <div className="mt-3 space-y-3">
        <ThisWeekRow
          icon="✅"
          iconBg="rgba(52,211,153,0.15)"
          title="Q1 Campaign Report — Due today"
          detail="Slide deck & exec summary for leadership sync at 4pm"
        />
        <ThisWeekRow
          icon="🎯"
          iconBg="rgba(108,99,255,0.15)"
          title="ICP Review Workshop — Wednesday"
          detail="With Product & Sales. Update segment scoring based on win/loss data."
        />
        <ThisWeekRow
          icon="✍️"
          iconBg="rgba(56,189,248,0.15)"
          title='Blog: "State of PMM 2025" — Friday deadline'
          detail="1,800 words. In review with SEO team."
        />
      </div>
    </div>
  );
}

function ThisWeekRow({
  icon,
  iconBg,
  title,
  detail
}: {
  icon: string;
  iconBg: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-[var(--radius)] border border-border bg-surface2 p-4">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[16px]"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="mt-1 text-[12px] leading-5 text-text2">{detail}</div>
      </div>
    </div>
  );
}

function QuickMetrics() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="font-[var(--font-heading)] text-[14px] font-bold text-text">
        📊 Quick Metrics
      </div>

      <div className="mt-3 space-y-3">
        <MetricBar
          label="LinkedIn ROAS"
          valueLabel="3.4×"
          pct={68}
          fill="bg-accent2"
          valueTone="text-green"
        />
        <MetricBar
          label="Meta ROAS"
          valueLabel="4.2×"
          pct={84}
          fill="bg-green"
          valueTone="text-green"
        />
        <MetricBar
          label="GA4 Organic Traffic"
          valueLabel="↑ 23%"
          pct={76}
          fill="bg-accent3"
          valueTone="text-accent3"
        />
        <MetricBar
          label="GTM Launch Readiness"
          valueLabel="72%"
          pct={72}
          fill="bg-yellow"
          valueTone="text-yellow"
        />
      </div>
    </div>
  );
}

function MetricBar({
  label,
  valueLabel,
  pct,
  fill,
  valueTone
}: {
  label: string;
  valueLabel: string;
  pct: number;
  fill: string;
  valueTone: string;
}) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] text-text2">{label}</span>
        <span className={`text-[12px] font-semibold ${valueTone}`}>{valueLabel}</span>
      </div>
      <div className="h-[6px] overflow-hidden rounded bg-surface3">
        <div className={`h-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

