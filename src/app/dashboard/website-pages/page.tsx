export default function WebsitePagesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Website & Pages</h1>
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
        <div className="text-sm text-[#f0f0f8]">Page Tracker</div>
        <table className="mt-2 w-full text-sm text-[#9090b0]">
          <tbody>
            <tr><td>/pricing</td><td>21 days old</td><td><span className="rounded-full bg-[#1e1e2e] px-2 py-1 text-xs">Fresh</span></td></tr>
            <tr><td>/solutions/revops</td><td>94 days old</td><td><span className="rounded-full bg-[#7c6cff]/20 px-2 py-1 text-xs">Stale</span></td></tr>
            <tr><td>/compare/acme</td><td>131 days old</td><td><span className="rounded-full bg-[#7c6cff]/20 px-2 py-1 text-xs">Very stale</span></td></tr>
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">AI Page Audit</div>
          /solutions/revops: weak proof points, CTA mismatch, no segment-specific objections.
        </div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">Health: 78/100</div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">Conversion intent: Medium</div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">SEO freshness: Needs work</div>
        </div>
      </div>
    </div>
  );
}

