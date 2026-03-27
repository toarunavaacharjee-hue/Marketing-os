import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

type WebsiteAsset = {
  id: string;
  title: string | null;
  status: string | null;
  last_seen_at: string | null;
};

export default async function WebsitePagesPage() {
  const supabase = createSupabaseServerClient();
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();

  let pages: WebsiteAsset[] = [];
  let latestSummary = "";

  if (ctx?.environmentId && ctx?.productId) {
    const { data: assets } = await supabase
      .from("assets")
      .select("id,title,status,last_seen_at")
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

  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-text" style={{ fontFamily: "var(--font-heading)" }}>
        Website & Pages
      </h1>

      {!withAges.length ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
          <div className="text-sm font-semibold text-text">No website page data yet</div>
          <div className="mt-2 text-sm text-text2">
            Connect integrations and ingest website assets from Settings, then this module will show real page-level data.
          </div>
          <div className="mt-3">
            <Link
              href="/dashboard/settings/integrations"
              className="inline-flex items-center rounded-[var(--radius2)] border border-border bg-surface2 px-3 py-2 text-xs font-semibold text-text transition hover:bg-surface3 hover:border-border2"
            >
              Configure integrations
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
          <div className="text-sm font-semibold text-text">Page Tracker</div>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {withAges.slice(0, 8).map((p) => {
                const age = p.ageDays;
                const freshness =
                  age == null ? "Unknown" : age <= 30 ? "Fresh" : age <= 90 ? "Stale" : "Very stale";
                const tone =
                  freshness === "Fresh"
                    ? "bg-[rgba(52,211,153,0.15)] text-green"
                    : freshness === "Stale"
                      ? "bg-[rgba(251,191,36,0.15)] text-yellow"
                      : freshness === "Very stale"
                        ? "bg-[rgba(248,113,113,0.15)] text-red"
                        : "bg-surface3 text-text2";
                return (
                  <tr key={p.id} className="border-t border-border first:border-t-0">
                    <td className="py-2 pr-3 text-text">{p.title}</td>
                    <td className="py-2 pr-3 text-text2">{age == null ? "Unknown age" : `${age} days old`}</td>
                    <td className="py-2 text-right">
                      <span className={`rounded-full px-2 py-1 text-xs ${tone}`}>{freshness}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-4 text-sm text-text2">
          <div className="text-sm font-semibold text-text">AI Page Audit</div>
          <div className="mt-2 whitespace-pre-wrap">
            {latestSummary || "Run Market Research scan to generate real page audit insights."}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
          <MetricCard
            label="Tracked pages"
            value={String(withAges.length)}
            tone="text-text"
          />
          <MetricCard
            label="Fresh pages (<=30d)"
            value={String(withAges.filter((p) => (p.ageDays ?? 9999) <= 30).length)}
            tone="text-green"
          />
          <MetricCard
            label="Stale pages (>90d)"
            value={String(withAges.filter((p) => (p.ageDays ?? 0) > 90).length)}
            tone="text-red"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4 text-sm">
      <div className="text-text2">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

