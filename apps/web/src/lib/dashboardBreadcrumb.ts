/**
 * Longest-prefix match for dashboard pathname → human title (breadcrumbs / header).
 */

const ROUTES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard/onboarding", title: "Onboarding" },
  { prefix: "/dashboard/settings", title: "Settings" },
  { prefix: "/dashboard/upgrade", title: "Upgrade" },
  { prefix: "/dashboard/market-research", title: "Market Research" },
  { prefix: "/dashboard/icp-segmentation", title: "ICP Segmentation" },
  { prefix: "/dashboard/positioning-studio", title: "Positioning Studio" },
  { prefix: "/dashboard/messaging-artifacts", title: "Messaging & Artifacts" },
  { prefix: "/dashboard/work", title: "Marketing Workbench" },
  { prefix: "/dashboard/campaigns", title: "Campaigns" },
  { prefix: "/dashboard/gtm-planner", title: "GTM Planner" },
  { prefix: "/dashboard/events", title: "Events" },
  { prefix: "/dashboard/content-studio", title: "Content Studio" },
  { prefix: "/dashboard/social-media", title: "Social Media" },
  { prefix: "/dashboard/design-assets", title: "Design & Assets" },
  { prefix: "/dashboard/presentations", title: "Presentations" },
  { prefix: "/dashboard/website-pages", title: "Website & Pages" },
  { prefix: "/dashboard/analytics", title: "Analytics" },
  { prefix: "/dashboard/battlecards", title: "Battlecards" },
  { prefix: "/dashboard/prospect-research", title: "Prospect Research" },
  { prefix: "/dashboard/sales-intelligence", title: "Sales Intelligence" },
  { prefix: "/dashboard/customer-insights", title: "Customer Insights" },
  { prefix: "/dashboard/copilot", title: "AI Copilot" },
  { prefix: "/dashboard/command-centre", title: "Command Centre" },
  { prefix: "/dashboard", title: "Command Centre" }
];

function normalizePath(pathname: string): string {
  const raw = pathname.split("?")[0] ?? "/dashboard";
  if (raw.length > 1 && raw.endsWith("/")) return raw.slice(0, -1);
  return raw || "/dashboard";
}

export function getDashboardBreadcrumb(pathname: string | null): { label: string; href: string }[] {
  const path = normalizePath(pathname ?? "/dashboard");
  const sorted = [...ROUTES].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const r of sorted) {
    if (path === r.prefix || path.startsWith(`${r.prefix}/`)) {
      const crumbs: { label: string; href: string }[] = [{ label: "Dashboard", href: "/dashboard" }];
      if (r.prefix === "/dashboard" && r.title === "Command Centre") {
        return crumbs;
      }
      crumbs.push({
        label: r.title,
        href: r.prefix === "/dashboard" ? "/dashboard" : r.prefix
      });
      return crumbs;
    }
  }
  return [{ label: "Dashboard", href: "/dashboard" }];
}
