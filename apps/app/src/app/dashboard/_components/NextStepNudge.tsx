"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Nudge = {
  label: string;
  href: string;
  hint: string;
};

const NUDGES: Record<string, Nudge> = {
  "/dashboard/market-research": {
    label: "ICP Segmentation",
    href: "/dashboard/icp-segmentation",
    hint: "Turn your market signals into defined customer segments."
  },
  "/dashboard/icp-segmentation": {
    label: "Positioning Studio",
    href: "/dashboard/positioning-studio",
    hint: "Generate your positioning canvas from these segments."
  },
  "/dashboard/positioning-studio": {
    label: "Messaging Pillars",
    href: "/dashboard/messaging-artifacts",
    hint: "Build per-segment headlines, value props, and objection handling."
  },
  "/dashboard/messaging-artifacts": {
    label: "Campaigns",
    href: "/dashboard/campaigns",
    hint: "Brief your first campaign using your approved messaging."
  },
  "/dashboard/campaigns": {
    label: "GTM Planner",
    href: "/dashboard/gtm-planner",
    hint: "Turn your campaign brief into a phased launch plan."
  },
  "/dashboard/gtm-planner": {
    label: "Events",
    href: "/dashboard/events",
    hint: "Plan event campaign assets for your launch moments."
  },
  "/dashboard/events": {
    label: "Content Studio",
    href: "/dashboard/content-studio",
    hint: "Create on-message content assets for your campaigns."
  },
  "/dashboard/content-studio": {
    label: "Social Media",
    href: "/dashboard/social-media",
    hint: "Schedule social content from your campaign brief."
  },
  "/dashboard/battlecards": {
    label: "Sales Intelligence",
    href: "/dashboard/sales-intelligence",
    hint: "Track objections and win/loss signals from the field."
  },
  "/dashboard/sales-intelligence": {
    label: "Customer Insights",
    href: "/dashboard/customer-insights",
    hint: "Close the intelligence loop with customer feedback."
  },
  "/dashboard/customer-insights": {
    label: "AI Copilot",
    href: "/dashboard/copilot",
    hint: "Get strategic recommendations based on your full dataset."
  }
};

export function NextStepNudge() {
  const pathname = usePathname();
  const nudge = NUDGES[pathname];
  if (!nudge) return null;

  return (
    <div className="mt-6 flex items-center gap-3 rounded-xl border border-teal/25 bg-[color-mix(in_srgb,var(--color-teal)_8%,transparent)] px-4 py-3">
      <span className="shrink-0 text-sm text-teal">→</span>
      <p className="min-w-0 flex-1 text-xs text-text2">
        <span className="font-medium text-text">Next step:</span> {nudge.hint}
      </p>
      <Link
        href={nudge.href}
        className="shrink-0 rounded-lg border border-teal/40 bg-[color-mix(in_srgb,var(--color-teal)_12%,transparent)] px-3 py-1.5 text-xs font-semibold text-teal transition-colors hover:bg-[color-mix(in_srgb,var(--color-teal)_20%,transparent)]"
      >
        {nudge.label} →
      </Link>
    </div>
  );
}
