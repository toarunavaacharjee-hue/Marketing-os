export default function MessagingArtifactsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Messaging & Artifacts</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 lg:col-span-2">
          <div className="mb-3 text-sm text-[#f0f0f8]">Artifacts</div>
          <table className="w-full text-sm">
            <thead className="text-[#9090b0]"><tr><th className="text-left">Artifact</th><th className="text-left">Segment</th><th className="text-left">Status</th><th className="text-left">Consistency</th></tr></thead>
            <tbody className="text-[#f0f0f8]">
              <tr><td>Homepage Hero</td><td>Series A SaaS</td><td><span className="rounded-full bg-[#1e1e2e] px-2 py-1 text-xs">Draft</span></td><td>86%</td></tr>
              <tr><td>1-pager</td><td>RevOps-led</td><td><span className="rounded-full bg-[#7c6cff]/20 px-2 py-1 text-xs">Review</span></td><td>91%</td></tr>
              <tr><td>Sales email sequence</td><td>Enterprise</td><td><span className="rounded-full bg-[#b8ff6c]/20 px-2 py-1 text-xs text-[#b8ff6c]">Approved</span></td><td>94%</td></tr>
            </tbody>
          </table>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="mb-3 text-sm text-[#f0f0f8]">Artifact Generator</div>
          <div className="space-y-2">
            <select className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]"><option>Landing page copy</option></select>
            <select className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]"><option>Series A SaaS</option></select>
            <select className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]"><option>Confident + practical</option></select>
            <button className="w-full rounded-xl bg-[#b8ff6c] p-2 text-sm font-medium text-black">Generate</button>
          </div>
        </div>
      </div>
    </div>
  );
}

