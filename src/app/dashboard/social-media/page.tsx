export default function SocialMediaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Social Media</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="text-sm text-[#f0f0f8]">Scheduled Posts</div>
          Tue 10:30 LinkedIn carousel<br/>Wed 09:00 X thread<br/>Thu 13:00 customer quote
          <div className="mt-3 rounded-xl border border-[#2a2e3f] bg-black/20 p-3">Timing Alert: LinkedIn engagement forecast dips after 3pm.</div>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">Platform Performance</div>
          {[
            ["LinkedIn", 69],["X",41],["YouTube",52],["Instagram",37]
          ].map(([n,p])=><div key={String(n)} className="mt-3"><div className="mb-1 flex justify-between text-xs text-[#9090b0]"><span>{n}</span><span>{p}%</span></div><div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-[#7c6cff]" style={{width:`${p}%`}}/></div></div>)}
        </div>
      </div>
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-sm text-[#f0f0f8]">AI Post Generator</div><input className="mt-2 w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]" placeholder="Topic: Attribution myth busting"/><button className="mt-2 rounded-xl bg-[#b8ff6c] px-3 py-2 text-sm text-black">Generate post set</button></div>
    </div>
  );
}

