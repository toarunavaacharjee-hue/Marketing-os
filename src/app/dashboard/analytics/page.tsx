import { AnalyticsCharts } from "@/app/dashboard/analytics/AnalyticsCharts";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Analytics</h1>
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Blended ROAS","3.4x"],
          ["CPL","$84"],
          ["Pipeline Influence","$148k"],
          ["SQL Rate","22%"]
        ].map(([k,v])=><div key={String(k)} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-xs text-[#9090b0]">{k}</div><div className="mt-1 text-2xl text-[#f0f0f8]">{v}</div></div>)}
      </div>
      <AnalyticsCharts />
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm">
        <div className="mb-2 text-[#f0f0f8]">Channel Performance + AI Recommendation</div>
        <table className="w-full text-[#9090b0]"><tbody><tr><td>Google Ads</td><td>ROAS 3.8x</td><td className="text-[#f0f0f8]">Increase brand defense budget +8%</td></tr><tr><td>LinkedIn</td><td>ROAS 2.6x</td><td className="text-[#f0f0f8]">Refresh hooks and tighten audiences</td></tr><tr><td>Meta</td><td>ROAS 3.1x</td><td className="text-[#f0f0f8]">Scale top retargeting set</td></tr></tbody></table>
      </div>
    </div>
  );
}

