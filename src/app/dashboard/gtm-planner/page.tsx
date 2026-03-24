"use client";
import { useMemo, useState } from "react";

const tasks = ["ICP finalized", "Messaging approved", "Creative produced", "Landing page QA", "Sales enablement ready"];
export default function GTMPlannerPage() {
  const [done, setDone] = useState<boolean[]>([true, true, false, false, false]);
  const pct = useMemo(() => Math.round((done.filter(Boolean).length / done.length) * 100), [done]);
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>GTM Planner</h1>
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
        <div className="mb-2 flex justify-between text-sm text-[#9090b0]"><span>Launch Readiness</span><span>{pct}%</span></div>
        <div className="h-2 rounded-full bg-black/30"><div className="h-2 rounded-full bg-[#7c6cff]" style={{width:`${pct}%`}}/></div>
        <div className="mt-4 space-y-2">{tasks.map((t,i)=><label key={t} className="flex items-center gap-2 text-sm text-[#f0f0f8]"><input type="checkbox" checked={done[i]} onChange={()=>setDone(done.map((v,idx)=>idx===i?!v:v))}/>{t}</label>)}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]"><div className="text-sm text-[#f0f0f8]">Launch Timeline</div><div className="mt-2">Mon: creative lock<br/>Tue: QA + tracking<br/>Wed: internal enablement<br/>Thu: soft launch<br/>Fri: full push</div></div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm"><div className="text-sm text-[#f0f0f8]">Stakeholders</div><table className="mt-2 w-full text-[#9090b0]"><tbody><tr><td>Marketing</td><td>R</td></tr><tr><td>Sales</td><td>A</td></tr><tr><td>RevOps</td><td>C</td></tr><tr><td>Design</td><td>R</td></tr></tbody></table></div>
      </div>
    </div>
  );
}

