import OperatorNav from "@/app/operator/OperatorNav";
import OperatorAuditLogClient from "@/app/operator/audit/OperatorAuditLogClient";

export default async function OperatorAuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">Audit log</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">Recent operator actions and reads.</p>
        <div className="mt-4">
          <OperatorNav active="audit" />
        </div>
      </div>

      <OperatorAuditLogClient />
    </div>
  );
}

