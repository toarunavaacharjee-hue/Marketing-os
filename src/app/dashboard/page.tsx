import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card } from "@/lib/ui";
import { DailyDigestCard } from "@/app/dashboard/DailyDigestCard";
import { ChannelBars } from "@/app/dashboard/ChannelBars";

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
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            className="text-4xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Good morning {name} <span className="text-[#7c6cff]">⚡</span>
          </div>
          <div className="mt-2 text-sm text-[#9090b0]">{dateLabel}</div>
        </div>

        <Link
          href="/dashboard/copilot"
          className="rounded-xl bg-[#b8ff6c] px-4 py-3 text-sm font-medium text-black"
        >
          Ask AI
        </Link>
      </div>

      {/* KPI row */}
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Kpi title="Active Campaigns" value="7" delta="+2 this week" />
        <Kpi title="Content Pieces Due" value="12" delta="3 overdue" tone="warn" />
        <Kpi title="Blended ROAS" value="3.4×" delta="+0.3 WoW" />
        <Kpi title="Pipeline Influence" value="$148k" delta="+18% MoM" />
      </div>

      {/* Two-column layout */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <NeedsAttention />
          <ThisWeek />
        </div>

        <div className="space-y-4">
          <DailyDigestCard />
          <QuickMetrics />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  delta,
  tone = "normal"
}: {
  title: string;
  value: string;
  delta: string;
  tone?: "normal" | "warn";
}) {
  return (
    <Card className="border border-[#2a2e3f] bg-[#141420] p-5">
      <div className="text-xs uppercase tracking-wider text-[#9090b0]">
        {title}
      </div>
      <div className="mt-2 text-3xl text-[#f0f0f8]">{value}</div>
      <div
        className={`mt-1 text-sm ${
          tone === "warn" ? "text-[#b8ff6c]" : "text-[#9090b0]"
        }`}
      >
        {delta}
      </div>
    </Card>
  );
}

function NeedsAttention() {
  return (
    <Card className="border border-[#2a2e3f] bg-[#141420] p-6">
      <div className="flex items-center justify-between">
        <div className="text-lg text-[#f0f0f8]">Needs Attention</div>
        <div className="text-xs text-[#9090b0]">3 flags</div>
      </div>

      <div className="mt-4 space-y-3">
        <FlagRow
          title="LinkedIn fatigue"
          detail="CTR down 22% in 10 days. Refresh creative & hooks."
          actions={["Review creatives", "Generate new angles"]}
        />
        <FlagRow
          title="Overdue brief"
          detail="Q2 webinar landing page brief is 5 days late."
          actions={["Assign owner", "Create brief"]}
        />
        <FlagRow
          title="Stale pages"
          detail="3 high-traffic pages haven’t been updated in 90+ days."
          actions={["Audit pages", "Draft updates"]}
        />
      </div>
    </Card>
  );
}

function FlagRow({
  title,
  detail,
  actions
}: {
  title: string;
  detail: string;
  actions: [string, string];
}) {
  return (
    <div className="rounded-2xl border border-[#2a2e3f] bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-[#f0f0f8]">{title}</div>
          <div className="mt-1 text-sm text-[#9090b0]">{detail}</div>
        </div>
        <div className="h-2 w-2 shrink-0 rounded-full bg-[#7c6cff]" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-xs font-medium text-black">
          {actions[0]}
        </button>
        <button className="rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-xs font-medium text-[#f0f0f8] hover:bg-white/5">
          {actions[1]}
        </button>
      </div>
    </div>
  );
}

function ThisWeek() {
  return (
    <Card className="border border-[#2a2e3f] bg-[#141420] p-6">
      <div className="flex items-center justify-between">
        <div className="text-lg text-[#f0f0f8]">This Week</div>
        <div className="text-xs text-[#9090b0]">Upcoming</div>
      </div>

      <div className="mt-4 space-y-3">
        <WeekItem
          when="Tue"
          title="Launch: Retargeting refresh"
          detail="Swap hooks + 3 new creatives across Meta."
        />
        <WeekItem
          when="Thu"
          title="Publish: ICP segmentation v2"
          detail="Roll out to messaging + ads audiences."
        />
        <WeekItem
          when="Fri"
          title="Report: Weekly performance snapshot"
          detail="ROAS + pipeline influence + key learnings."
        />
      </div>
    </Card>
  );
}

function WeekItem({
  when,
  title,
  detail
}: {
  when: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-[#2a2e3f] bg-black/20 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e1e2e] text-sm text-[#f0f0f8]">
        {when}
      </div>
      <div>
        <div className="text-sm text-[#f0f0f8]">{title}</div>
        <div className="mt-1 text-sm text-[#9090b0]">{detail}</div>
      </div>
    </div>
  );
}

function QuickMetrics() {
  return (
    <Card className="border border-[#2a2e3f] bg-[#141420] p-6">
      <div className="flex items-center justify-between">
        <div className="text-lg text-[#f0f0f8]">Quick Metrics</div>
        <div className="text-xs text-[#9090b0]">Last 7 days</div>
      </div>

      <div className="mt-4">
        <ChannelBars
          items={[
            { label: "Google Ads", value: 78, color: "#7c6cff" },
            { label: "LinkedIn", value: 54, color: "#b8ff6c" },
            { label: "Meta", value: 61, color: "#7c6cff" },
            { label: "Email", value: 42, color: "#b8ff6c" }
          ]}
        />
      </div>
    </Card>
  );
}

