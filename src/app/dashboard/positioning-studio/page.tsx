"use client";
import { useState } from "react";

export default function PositioningStudioPage() {
  const [doc, setDoc] = useState({
    category: "AI-powered GTM operating system for B2B SaaS",
    target: "Marketing leaders in 20-500 employee SaaS teams",
    problem: "Fragmented campaign execution and poor signal-to-action loops",
    solution: "Unified modules + copilot that turns data into weekly actions",
    diff: "Faster execution loops, built-in playbooks, cross-channel visibility",
    wedge: "Command Centre + AI Copilot daily actions"
  });
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Positioning Studio</h1>
        {Object.entries(doc).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
            <div className="mb-2 text-xs uppercase text-[#9090b0]">{k}</div>
            <textarea value={v} onChange={(e)=>setDoc({...doc,[k]:e.target.value})} className="min-h-[72px] w-full rounded-xl border border-[#2a2e3f] bg-black/20 p-3 text-sm text-[#f0f0f8]"/>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
          <div className="text-sm text-[#f0f0f8]">Health Scores</div>
          {[
            ["Clarity", 82],["Differentiation",74],["Credibility",79],["Message-market fit",85]
          ].map(([k,v])=>(
            <div className="mt-3" key={String(k)}><div className="mb-1 flex justify-between text-xs text-[#9090b0]"><span>{k}</span><span>{v}%</span></div><div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-[#7c6cff]" style={{width:`${v}%`}}/></div></div>
          ))}
        </div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]">
          <div className="mb-2 text-sm text-[#f0f0f8]">Version History</div>
          <div>v1.4 — Updated wedge for enterprise trial motion</div>
          <div>v1.3 — Reframed solution for RevOps audience</div>
          <div>v1.2 — Added proof statements and ROI language</div>
        </div>
      </div>
    </div>
  );
}

