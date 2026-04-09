import Link from "next/link";
import OperatorNav from "@/app/operator/OperatorNav";
import OperatorUserDetailClient from "@/app/operator/users/[id]/OperatorUserDetailClient";

export default async function OperatorUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = (id ?? "").trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">User detail</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">
          <span className="font-mono text-[12px] text-[var(--text)]">{userId || "—"}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <OperatorNav active="users" />
          <Link
            href="/operator/users"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface3)]"
          >
            ← Back to users
          </Link>
        </div>
      </div>

      <OperatorUserDetailClient userId={userId} />
    </div>
  );
}

