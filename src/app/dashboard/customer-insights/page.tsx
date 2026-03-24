export default function CustomerInsightsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Customer Insights</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-xs text-[#9090b0]">NPS</div><div className="text-3xl text-[#f0f0f8]">47</div></div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-xs text-[#9090b0]">CSAT</div><div className="text-3xl text-[#f0f0f8]">4.5 / 5</div></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">VOC Quotes</div>
          {[
            "We finally know what to do every Monday.",
            "Copilot turns insights into action.",
            "Cross-channel visibility improved reporting speed."
          ].map(q=><div key={q} className="mt-2 rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#9090b0]">"{q}" <button className="ml-2 rounded-lg border border-[#2a2e3f] px-2 py-1 text-xs text-[#f0f0f8]">Use in messaging</button></div>)}
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">Feedback Themes</div>
          {[
            ["Speed to execution",71],["Attribution confidence",63],["Onboarding friction",34]
          ].map(([n,p])=><div key={String(n)} className="mt-3"><div className="mb-1 flex justify-between text-xs text-[#9090b0]"><span>{n}</span><span>{p}%</span></div><div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-[#7c6cff]" style={{width:`${p}%`}}/></div></div>)}
          <div className="mt-4 rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#9090b0]"><span className="text-[#f0f0f8]">AI Summary:</span> Customer sentiment is positive around execution speed; biggest retention risk is onboarding clarity for cross-functional teams.</div>
        </div>
      </div>
    </div>
  );
}

