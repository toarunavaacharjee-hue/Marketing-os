import Link from "next/link";
import { redirect } from "next/navigation";
import { getOperatorGate } from "@/lib/platformAdmin";

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const gate = await getOperatorGate();
  if (!gate.ok) {
    redirect(gate.redirect === "login" ? "/login?next=/operator" : "/dashboard");
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">
            Marketing OS
          </div>
          <div className="font-[var(--font-heading)] text-lg font-semibold">Operator console</div>
          <p className="mt-1 max-w-xl text-xs text-[var(--text2)]">
            Platform metrics and subscribers. Not shown to tenant users. Restrict access via{" "}
            <code className="rounded bg-[var(--surface2)] px-1 text-[11px]">is_platform_admin</code> only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--accent2)] hover:bg-[var(--surface2)]"
          >
            ← Back to app
          </Link>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-sm text-[var(--text)] hover:bg-[var(--surface3)]"
            >
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1200px] px-4 py-8">{children}</main>
    </div>
  );
}
