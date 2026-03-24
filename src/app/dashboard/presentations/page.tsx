export default function PresentationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Presentations</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 lg:col-span-2 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Slide Library</div>
          Executive pitch deck — 24 slides<br/>Product deep dive — 18 slides<br/>Competitive teardown — 15 slides
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">AI Deck Builder</div>
          <input className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]" placeholder="Deck goal"/>
          <button className="mt-2 w-full rounded-xl bg-[#b8ff6c] p-2 text-sm text-black">Build deck</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {["Market snapshot module","ROI proof module","Implementation module"].map(m=><div key={m} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">{m}</div>)}
      </div>
    </div>
  );
}

