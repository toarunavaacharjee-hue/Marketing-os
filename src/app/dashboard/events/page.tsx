export default function EventsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Events</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">Upcoming Events</div>
          {[
            ["SaaS Growth Summit", 72],
            ["RevOps Roundtable", 48],
            ["Demand Gen Live", 85]
          ].map(([n,p])=>(
            <div className="mt-3" key={String(n)}><div className="mb-1 flex justify-between text-sm text-[#9090b0]"><span>{n}</span><span>{p}% prep</span></div><div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-[#7c6cff]" style={{width:`${p}%`}}/></div></div>
          ))}
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Past Event ROI (demo)</div>
          Q1 Summit: 146% ROI<br/>Pipeline influenced: $92k<br/>Meetings booked: 43
          <div className="mt-4 flex gap-2"><button className="rounded-xl bg-[#b8ff6c] px-3 py-2 text-xs text-black">Generate event brief</button><button className="rounded-xl border border-[#2a2e3f] px-3 py-2 text-xs text-[#f0f0f8]">Generate booth script</button></div>
        </div>
      </div>
    </div>
  );
}

