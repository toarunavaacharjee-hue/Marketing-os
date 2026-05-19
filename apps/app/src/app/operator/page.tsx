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
  const statusEntries = Object.entries(stats.mrr.statusBreakdown ?? {}).sort((a, b) => b[1] - a[1]);
  const hasMrr = stats.mrr.total > 0 || stats.mrr.activePaidCompanies > 0;

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

      {/* MRR section */}
      {hasMrr ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Estimated MRR</div>
          <p className="mt-1 text-xs text-[var(--text2)]">
            Based on active + trialing subscriptions at list prices ($99 Starter · $299 Growth · $999 Enterprise). Does
            not reflect annual discounts, custom deals, or Stripe actuals.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total est. MRR" value={`$${stats.mrr.total.toLocaleString()}`} hint="Active + trialing" />
            <StatCard label="Active paid workspaces" value={stats.mrr.activePaidCompanies} />
            {stats.mrr.starter > 0 && <StatCard label="Starter MRR" value={`$${stats.mrr.starter.toLocaleString()}`} />}
            {stats.mrr.growth > 0 && <StatCard label="Growth MRR" value={`$${stats.mrr.growth.toLocaleString()}`} />}
            {stats.mrr.enterprise > 0 && <StatCard label="Enterprise MRR" value={`$${stats.mrr.enterprise.toLocaleString()}`} />}
          </div>
        </div>
      ) : null}

      {companyPlanEntries.length ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-start gap-6">
            <div>
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
            </div>
            {statusEntries.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-[var(--text)]">Subscription status</div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {statusEntries.map(([st, n]) => {
                    const color =
                      st === "active"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : st === "trialing"
                          ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                          : st === "past_due"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)]";
                    return (
                      <li
                        key={st}
                        className={`rounded-[var(--radius2)] border px-3 py-1 text-xs ${color}`}
                      >
                        <span className="font-semibold">{st}</span> · {n}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">Companies</h2>
        <p className="mt-1 text-xs text-[var(--text2)]">
          This is the source of truth for plan and seat limits (per company). Edit plan + seats here. The Accounts column
          shows which users belong to each workspace (from company_members). Deleting a workspace removes the company and
          its data per your database cascade rules (irreversible).
        </p>
        <OperatorCompaniesClient initialCompanies={companies} />
      </div>

      <div>
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">Subscribers</h2>
        <p className="mt-1 text-xs text-[var(--text2)]">
          From Auth users, merged with public.profiles. Sort: newest registration first. The profile Company field is
          legacy free text; use Companies → Accounts or the Users tab → Workspaces for real workspace membership.
        </p>
        <OperatorSubscribersClient
          initialSubscribers={subscribers}
          operatorUserId={gate.ok ? gate.userId : ""}
        />
      </div>
    </div>
  );
}
