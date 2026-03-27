import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type WebsiteAsset = {
  id: string;
  title: string | null;
  url: string | null;
  source: string | null;
  status: string | null;
  last_seen_at: string | null;
};

function displayPath(raw: string | null): string {
  if (!raw) return "—";
  const t = raw.trim();
  try {
    if (t.startsWith("http://") || t.startsWith("https://")) {
      const u = new URL(t);
      return u.pathname && u.pathname !== "/" ? u.pathname : u.hostname;
    }
  } catch {
    /* ignore */
  }
  return t;
}

function ageLabel(days: number | null): string {
  if (days == null) return "Unknown age";
  if (days === 0) return "Today";
  if (days === 1) return "1 day old";
  return `${days} days old`;
}

export default async function WebsitePagesPage() {
  const supabase = createSupabaseServerClient();
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();

  let pages: WebsiteAsset[] = [];
  let latestSummary = "";

  if (ctx?.environmentId && ctx?.productId) {
    const { data: assets } = await supabase
      .from("assets")
      .select("id,title,url,source,status,last_seen_at")
      .eq("environment_id", ctx.environmentId)
      .eq("source", "website")
      .eq("asset_type", "page")
      .order("last_seen_at", { ascending: false })
      .limit(20);

    pages = ((assets ?? []) as WebsiteAsset[]).filter((p) => Boolean(p.title));

    const { data: scan } = await supabase
      .from("research_scans")
      .select("summary")
      .eq("environment_id", ctx.environmentId)
      .eq("product_id", ctx.productId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    latestSummary = (scan?.summary ?? "").trim();
  }

  const now = Date.now();
  const withAges = pages.map((p) => {
    const ts = p.last_seen_at ? new Date(p.last_seen_at).getTime() : NaN;
    const ageDays = Number.isNaN(ts) ? null : Math.max(0, Math.floor((now - ts) / 86400000));
    return { ...p, ageDays };
  });

  const freshCount = withAges.filter((p) => (p.ageDays ?? 9999) <= 30).length;
  const staleCount = withAges.filter((p) => (p.ageDays ?? 0) > 90).length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-text" style={{ fontFamily: "var(--font-heading)" }}>
        Website & Pages
      </h1>

      {/* Page Tracker — full width */}
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <div className="text-sm font-semibold text-text">Page Tracker</div>
        <p className="mt-2 text-[13px] leading-relaxed text-text2">
          URLs come from your <strong className="text-text">live website crawl</strong> (not Google Analytics). We
          discover paths from links on your homepage. A nav link to <span className="font-mono">/pricing</span> or an
          SPA that returns the same HTML for several routes can still produce a row; new scans skip pages whose text is
          almost identical to the homepage.
        </p>
        {!withAges.length ? (
          <div className="mt-4 rounded-[var(--radius2)] border border-dashed border-border bg-surface2/50 p-6 text-center">
            <div className="text-sm text-text2">
              No pages yet. Run <strong className="text-text">Market Research → Run AI Scan</strong> to crawl your
              product site and ingest pages here automatically.
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link
                href="/dashboard/market-research"
                className="inline-flex rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee]"
              >
                Run AI Scan
              </Link>
              <Link
                href="/dashboard/settings/integrations"
                className="inline-flex rounded-[var(--radius2)] border border-border bg-surface2 px-4 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
              >
                Integrations
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-text2">
                  <th className="pb-3 pr-4">Path</th>
                  <th className="pb-3 pr-4 hidden md:table-cell">Source</th>
                  <th className="pb-3 pr-4">Last updated</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {withAges.slice(0, 12).map((p) => {
                  const age = p.ageDays;
                  const freshness =
                    age == null ? "Unknown" : age <= 30 ? "Fresh" : age <= 90 ? "Aging" : "Stale";
                  const tone =
                    freshness === "Fresh"
                      ? "bg-[rgba(52,211,153,0.18)] text-green border border-[rgba(52,211,153,0.35)]"
                      : freshness === "Aging"
                        ? "bg-[rgba(251,191,36,0.12)] text-yellow border border-[rgba(251,191,36,0.25)]"
                        : freshness === "Stale"
                          ? "bg-[rgba(248,113,113,0.12)] text-red border border-[rgba(248,113,113,0.25)]"
                          : "border border-border bg-surface3 text-text2";
                  return (
                    <tr key={p.id} className="border-b border-border/80 last:border-0">
                      <td className="py-3 pr-4 font-mono text-[13px] text-text">
                        <div>{displayPath(p.title)}</div>
                        {p.url ? (
                          <div className="mt-1 max-w-[280px] truncate text-[11px] text-text3 md:max-w-md">
                            {p.url}
                          </div>
                        ) : null}
                      </td>
                      <td className="hidden py-3 pr-4 text-[13px] text-text2 md:table-cell">
                        {p.source === "website"
                          ? "Market Research crawl"
                          : p.source ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-text2">{ageLabel(age)}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tone}`}
                        >
                          {freshness}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Audit + stats */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)] lg:items-start">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
          <div className="text-sm font-semibold text-text">AI Page Audit</div>
          <p className="mt-1 text-sm text-text2">
            Insights from your latest Market Research scan — run a scan to refresh.
          </p>
          <div className="mt-4 min-h-[120px] rounded-[var(--radius2)] border border-border bg-surface2/80 p-4 text-sm leading-relaxed text-text2">
            {latestSummary ? (
              <div className="whitespace-pre-wrap text-text">{latestSummary}</div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <span>
                  Run a Market Research scan to generate real page-level and competitive context for
                  your site.
                </span>
                <Link
                  href="/dashboard/market-research"
                  className="inline-flex rounded-[var(--radius2)] bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5b52ee]"
                >
                  Open Market Research
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <MetricCard label="Tracked pages" value={String(withAges.length)} valueClass="text-text" />
          <MetricCard
            label="Fresh pages (≤30d)"
            value={String(freshCount)}
            valueClass="text-green"
          />
          <MetricCard
            label={"Stale pages (>90d)"}
            value={String(staleCount)}
            valueClass="text-red"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  valueClass
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface px-5 py-4">
      <div className="text-xs font-medium uppercase tracking-wide text-text2">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}
