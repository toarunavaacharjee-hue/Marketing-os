export default function SalesIntelligencePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Sales Intelligence</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">Objection Themes</div>
          {[
            ["Price sensitivity",62],["Integration concern",48],["Proof depth",55]
          ].map(([n,p])=><div key={String(n)} className="mt-3"><div className="mb-1 flex justify-between text-xs text-[#9090b0]"><span>{n}</span><span>{p}%</span></div><div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-[#7c6cff]" style={{width:`${p}%`}}/></div></div>)}
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Win/Loss by Segment</div>
          Mid-market: 58/42<br/>Enterprise: 44/56<br/>PLG upmarket: 63/37
        </div>
      </div>
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
        <div className="text-sm text-[#f0f0f8]">Recent Call Insights</div>
        1) "Need proof this works with small teams."<br/>2) "Timeline risk is unclear."<br/>3) "How does this compare to Acme?"
        <div className="mt-3 flex gap-2"><button className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-xs text-black">Generate rebuttals</button><button className="rounded-xl border border-[#2a2e3f] px-3 py-2 text-xs text-[#f0f0f8]">Update battlecard</button></div>
      </div>
    </div>
  );
}

