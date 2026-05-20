"use client";

import { useEffect, useState } from "react";
import { InsightWorkbench } from "@/app/dashboard/_components/InsightWorkbench";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

type EventStats = {
  total: number;
  avgPrepPct: number;
  upcomingCount: number;
};

export function EventsClient({ environmentId }: { environmentId: string }) {
  const [stats, setStats] = useState<EventStats | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data: EventStats) => setStats(data))
      .catch(() => {
        // silently fall back to placeholder dashes
      });
  }, []);

  const statCards = [
    {
      label: "Events tracked",
      sub: "Total in workspace",
      value: stats ? String(stats.total) : "—"
    },
    {
      label: "Avg. prep score",
      sub: "Across all events",
      value: stats ? `${stats.avgPrepPct}%` : "—"
    },
    {
      label: "Upcoming events",
      sub: "Next 30 days",
      value: stats ? String(stats.upcomingCount) : "—"
    }
  ];

  return (
    <ModuleShell
      title="Events"
      subtitle="Track conferences, webinars, and field events. Plan logistics, capture leads, and generate follow-up campaigns."
      actions={
        <div className="flex items-center gap-2 text-xs text-text3">
          <span className="rounded-full border border-border bg-surface2 px-3 py-1.5">
            GTM Planner
          </span>
          <span>→</span>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-primary">
            Events
          </span>
          <span>→</span>
          <span className="rounded-full border border-border bg-surface2 px-3 py-1.5">
            Content Studio
          </span>
        </div>
      }
    >
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="hs-card hs-card-hover p-4">
            <div className="text-xs text-text3">{s.sub}</div>
            <div className="mt-1 text-2xl font-semibold text-text">{s.value}</div>
            <div className="mt-0.5 text-sm text-text2">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tips row */}
      <div className="rounded-xl border border-border bg-surface2 px-4 py-3 text-sm text-text2">
        <span className="font-medium text-text">Pro tip:</span> Add event details, then use{" "}
        <span className="font-medium text-primary">✦ Generate campaign</span> to create a pre-event
        content plan, booth brief, and post-event follow-up sequence — all in one click.
      </div>

      {/* The actual InsightWorkbench — owns all event CRUD + AI */}
      <InsightWorkbench environmentId={environmentId} variant="events" title="Events" />
    </div>
    </ModuleShell>
  );
}
