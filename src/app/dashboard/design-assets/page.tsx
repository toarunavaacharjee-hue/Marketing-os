export default function DesignAssetsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Design & Assets</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Design Requests</div>
          <table className="mt-2 w-full"><tbody><tr><td>LinkedIn ad set v3</td><td>In progress</td></tr><tr><td>Case study one-pager</td><td>Review</td></tr><tr><td>Webinar banner</td><td>Queued</td></tr></tbody></table>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-sm text-[#f0f0f8]">Asset Library</div><div className="mt-2 grid grid-cols-3 gap-2">{["Hero","Ad 1","Ad 2","Deck cover","Feature card","Logo alt"].map(a=><div key={a} className="h-20 rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-xs text-[#9090b0]">{a}</div>)}</div></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-sm text-[#f0f0f8]">Brand Colors</div><div className="mt-2 flex gap-2">{["#08080c","#141420","#7c6cff","#b8ff6c"].map(c=><div key={c} className="h-10 w-10 rounded-lg border border-[#2a2e3f]" style={{background:c}} title={c}/>)}</div></div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-sm text-[#f0f0f8]">Creative Brief Generator</div><textarea className="mt-2 min-h-[100px] w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]" placeholder="Campaign objective, audience, CTA..."/><button className="mt-2 rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm text-black">Generate brief</button></div>
      </div>
    </div>
  );
}

