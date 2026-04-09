import { loadOperatorData } from "@/app/operator/loadOperatorData";
import OperatorCompaniesClient from "@/app/operator/OperatorCompaniesClient";
import OperatorSubscribersClient from "@/app/operator/OperatorSubscribersClient";
import OperatorNav from "@/app/operator/OperatorNav";
import { getOperatorGate } from "@/lib/platformAdmin";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text3)]">{label}</div>
      <div className="mt-1 font-[var(--font-heading)] text-2xl font-bold text-[var(--text)]">{value}</div>
      {hint ? <div className="mt-1 text-xs text-[var(--text2)]">{hint}</div> : null}
    </div>
  );
}

export default async function OperatorPage() {
  const gate = await getOperatorGate();
  const data = await loadOperatorData();

  if (!data.serviceRole) {
    return (
      <div className="space-y-4">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">
          Configuration required
        </h1>
        <div className="rounded-[var(--radius)] border border-[var(--yellow)]/30 bg-[var(--yellow)]/10 p-4 text-sm text-[var(--text)]">
          {data.message}
        </div>
      </div>
    );
  }

  const { stats, companies, subscribers } = data;
  const companyPlanEntries = Object.entries(stats.companyPlanBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const legacyUserPlanEntries = Object.entries(stats.legacyUserPlanBreakdown ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">Overview</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Aggregated with the Supabase service role on the server. RLS does not apply to these queries.
        </p>
        <div className="mt-4">
          <OperatorNav active="overview" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Auth users (subscribers)" value={stats.subscriberCount} />
        <StatCard
          label="New signups (7 days)"
          value={stats.newSubscribers7d}
          hint="By Auth user created_at"
        />
        <StatCard label="AI queries (sum)" value={stats.totalAiQueries} hint="Across profiles.ai_queries_used" />
        <StatCard label="Companies" value={stats.companyCount} />
        <StatCard label="Products" value={stats.productCount} />
        <StatCard label="Environments" value={stats.environmentCount} />
        <StatCard label="Research scans" value={stats.researchScanCount} />
        <StatCard
          label="Sync runs"
          value={stats.syncRunCount ?? "—"}
          hint={stats.syncRunCount == null ? "Table missing or error" : undefined}
        />
      </div>

      {companyPlanEntries.length ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Plans (companies)</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {companyPlanEntries.map(([plan, n]) => (
              <li
                key={plan}
                className="rounded-[var(--radius2)] border border-[var(--border)] bg-[var(--surface2)] px-3 py-1 text-xs text-[var(--text2)]"
              >
                <span className="text-[var(--text)]">{plan}</span> · {n}
              </li>
            ))}
          </ul>
          {legacyUserPlanEntries.length ? (
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <div className="text-xs text-[var(--text2)]">
                Legacy per-user plan values (profiles.plan) — no longer used for access.
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {legacyUserPlanEntries.map(([plan, n]) => (
                  <li
                    key={plan}
                    className="rounded-[var(--radius2)] border border-[var(--border)] bg-[var(--surface2)] px-3 py-1 text-xs text-[var(--text2)]"
                  >
                    <span className="text-[var(--text)]">{plan}</span> · {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">Companies</h2>
        <p className="mt-1 text-xs text-[var(--text2)]">
          This is the source of truth for plan and seat limits (per company). Edit plan + seats here.
        </p>
        <OperatorCompaniesClient initialCompanies={companies} />
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">Subscribers</h2>
        <p className="mt-1 text-xs text-[var(--text2)]">
          From Auth users, merged with public.profiles. Sort: newest registration first.
        </p>
        <OperatorSubscribersClient
          initialSubscribers={subscribers}
          operatorUserId={gate.ok ? gate.userId : ""}
        />
      </div>
    </div>
  );
}
