import OperatorNav from "@/app/operator/OperatorNav";
import OperatorAnalyticsClient from "@/app/operator/analytics/OperatorAnalyticsClient";

export const dynamic = "force-dynamic";

export default function OperatorAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">
          Product Analytics
        </h1>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Real-time usage, feature adoption, errors, and per-user activity — last 30 days.
        </p>
        <div className="mt-4">
          <OperatorNav active="analytics" />
        </div>
      </div>
      <OperatorAnalyticsClient />
    </div>
  );
}
