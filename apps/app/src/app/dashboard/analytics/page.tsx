import { AnalyticsClient } from "@/app/dashboard/analytics/AnalyticsClient";
import { ModuleShell } from "@/app/dashboard/_components/ModuleShell";

export default function AnalyticsPage() {
  return (
    <ModuleShell title="Analytics" subtitle="Track website, ad, and campaign performance across GA4, LinkedIn, and Meta.">
      <AnalyticsClient />
    </ModuleShell>
  );
}

