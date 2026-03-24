export default function MarketResearchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Market Research</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 lg:col-span-2">
          <div className="mb-3 text-sm text-[#f0f0f8]">AI Signals Feed</div>
          <div className="space-y-2 text-sm text-[#9090b0]">
            <div className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3">Search demand for "AI GTM planner" up 18% WoW.</div>
            <div className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3">Competitor ad fatigue detected in LinkedIn mid-funnel segment.</div>
            <div className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3">New forum clusters discussing attribution pain in B2B SaaS.</div>
          </div>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="mb-3 text-sm text-[#f0f0f8]">Monitoring Sources</div>
          <ul className="space-y-2 text-sm text-[#9090b0]">
            <li>Google Trends (weekly)</li><li>G2 category reviews</li><li>LinkedIn ad library</li><li>Reddit / Slack communities</li>
          </ul>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="mb-3 text-sm text-[#f0f0f8]">Market Opportunity Table</div>
          <table className="w-full text-sm">
            <thead className="text-[#9090b0]"><tr><th className="text-left">Segment</th><th className="text-left">Demand</th><th className="text-left">Gap</th><th className="text-left">Score</th></tr></thead>
            <tbody className="text-[#f0f0f8]">
              <tr><td>PLG SaaS</td><td>High</td><td>Medium</td><td>8.4</td></tr>
              <tr><td>Mid-market B2B</td><td>Medium</td><td>High</td><td>8.9</td></tr>
              <tr><td>Agency teams</td><td>Medium</td><td>Medium</td><td>7.1</td></tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="mb-3 text-sm text-[#f0f0f8]">Research Chat Widget</div>
          <div className="rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#9090b0]">Q: What is the fastest-growing niche this quarter?</div>
          <div className="mt-2 rounded-xl border border-[#2a2e3f] bg-[#1e1e2e] p-3 text-sm text-[#f0f0f8]">A: Mid-market B2B attribution tooling shows strongest urgency and budget intent.</div>
        </div>
      </div>
    </div>
  );
}

