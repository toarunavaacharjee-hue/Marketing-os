"use client";
import { useState } from "react";

const segments = [
  { id: "s1", name: "Series A SaaS", pnf: 88, pains: ["Attribution gaps", "Small team bandwidth"] },
  { id: "s2", name: "RevOps-led B2B", pnf: 81, pains: ["CRM hygiene", "Forecast confidence"] },
  { id: "s3", name: "PLG product teams", pnf: 76, pains: ["Activation drop", "Signal noise"] },
  { id: "s4", name: "Agencies", pnf: 63, pains: ["Client churn", "Reporting overhead"] },
  { id: "s5", name: "Enterprise enablement", pnf: 72, pains: ["Approval cycles", "Fragmented tooling"] }
];

export default function IcpSegmentationPage() {
  const [active, setActive] = useState(segments[0]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>ICP Segmentation</h1>
      <div className="grid gap-3 md:grid-cols-5">
        {segments.map((s) => (
          <button key={s.id} onClick={() => setActive(s)} className={`rounded-2xl border p-3 text-left ${active.id===s.id?"border-[#7c6cff] bg-[#1e1e2e]":"border-[#2a2e3f] bg-[#141420]"}`}>
            <div className="text-sm text-[#f0f0f8]">{s.name}</div>
            <div className="mt-1 text-xs text-[#9090b0]">PNF {s.pnf}</div>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">Detailed Scorecard — {active.name}</div>
          {[
            ["Urgency", 84],
            ["Budget Fit", 79],
            ["ACV Potential", 73],
            ["Retention Potential", 87]
          ].map(([k,v])=>(
            <div key={String(k)} className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-[#9090b0]"><span>{k}</span><span>{v}%</span></div>
              <div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-[#7c6cff]" style={{width:`${v}%`}}/></div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
            <div className="text-sm text-[#f0f0f8]">Pain Points</div>
            <ul className="mt-2 list-disc pl-5 text-sm text-[#9090b0]">{active.pains.map(p=><li key={p}>{p}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
            <div className="text-sm text-[#f0f0f8]">ICP Profile</div>
            Team size 8-25, GTM motion mix of inbound + outbound, monthly paid budget $20k-$80k, looking for faster campaign iteration.
          </div>
        </div>
      </div>
    </div>
  );
}

