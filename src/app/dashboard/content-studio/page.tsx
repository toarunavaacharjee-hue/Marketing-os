export default function ContentStudioPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Content Studio</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 lg:col-span-2">
          <div className="mb-3 text-sm text-[#f0f0f8]">Content Queue</div>
          <table className="w-full text-sm text-[#9090b0]"><tbody><tr><td>AI GTM brief</td><td>Thu</td><td>Drafting</td></tr><tr><td>LinkedIn carousel</td><td>Fri</td><td>Review</td></tr><tr><td>Customer story</td><td>Mon</td><td>Planned</td></tr></tbody></table>
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4"><div className="text-sm text-[#f0f0f8]">AI Generator</div><textarea className="mt-2 min-h-[96px] w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]" placeholder="Generate a thought leadership post..."/><button className="mt-2 w-full rounded-xl bg-[#b8ff6c] p-2 text-sm font-medium text-black">Generate</button></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]"><div className="text-sm text-[#f0f0f8]">Mini Calendar</div>Tue: blog draft<br/>Wed: design review<br/>Thu: publish page<br/>Fri: social clips</div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]"><div className="text-sm text-[#f0f0f8]">Performance Stats</div>Avg CTR 2.8%<br/>Avg read time 3m 12s<br/>Top format: comparison posts</div>
      </div>
    </div>
  );
}

