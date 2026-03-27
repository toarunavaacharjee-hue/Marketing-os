import { AnalyticsClient } from "@/app/dashboard/analytics/AnalyticsClient";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-text" style={{ fontFamily: "var(--font-heading)" }}>
        Analytics
      </h1>
      <AnalyticsClient />
    </div>
  );
}

