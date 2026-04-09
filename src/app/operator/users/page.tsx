import OperatorNav from "@/app/operator/OperatorNav";
import OperatorUsersClient from "@/app/operator/users/OperatorUsersClient";
import { getOperatorGate } from "@/lib/platformAdmin";

export default async function OperatorUsersPage() {
  const gate = await getOperatorGate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">Users</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">Search, inspect, and control individual users.</p>
        <div className="mt-4">
          <OperatorNav active="users" />
        </div>
      </div>

      <OperatorUsersClient operatorUserId={gate.ok ? gate.userId : ""} />
    </div>
  );
}

