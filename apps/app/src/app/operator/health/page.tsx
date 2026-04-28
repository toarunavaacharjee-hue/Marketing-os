import OperatorNav from "@/app/operator/OperatorNav";
import OperatorToolHealthClient from "@/app/operator/health/OperatorToolHealthClient";

export default async function OperatorHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">Tool health</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">Queue health and manual worker controls.</p>
        <div className="mt-4">
          <OperatorNav active="health" />
        </div>
      </div>

      <OperatorToolHealthClient />
    </div>
  );
}

