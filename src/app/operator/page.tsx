import { loadOperatorData } from "@/app/operator/loadOperatorData";

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

  const { stats, subscribers } = data;
  const planEntries = Object.entries(stats.planBreakdown).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[var(--text)]">Overview</h1>
        <p className="mt-1 text-sm text-[var(--text2)]">
          Aggregated with the Supabase service role on the server. RLS does not apply to these queries.
        </p>
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

      {planEntries.length ? (
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="text-sm font-semibold text-[var(--text)]">Plans (profile rows)</div>
          <ul className="mt-2 flex flex-wrap gap-2">
            {planEntries.map(([plan, n]) => (
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

      <div>
        <h2 className="font-[var(--font-heading)] text-lg font-semibold text-[var(--text)]">Subscribers</h2>
        <p className="mt-1 text-xs text-[var(--text2)]">
          From Auth users, merged with public.profiles. Sort: newest registration first.
        </p>
        <div className="mt-3 overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[10px] font-semibold uppercase text-[var(--text3)]">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">AI used</th>
                <th className="px-3 py-2">Operator</th>
                <th className="px-3 py-2">Signed up</th>
                <th className="px-3 py-2">Last sign-in</th>
              </tr>
            </thead>
            <tbody className="text-[var(--text2)]">
              {subscribers.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono text-[12px] text-[var(--text)]">{s.email ?? "—"}</td>
                  <td className="px-3 py-2">{s.name ?? "—"}</td>
                  <td className="px-3 py-2">{s.company ?? "—"}</td>
                  <td className="px-3 py-2">{s.plan ?? "—"}</td>
                  <td className="px-3 py-2">{s.ai_queries_used}</td>
                  <td className="px-3 py-2">{s.is_platform_admin ? "Yes" : "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.auth_created_at ? new Date(s.auth_created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
