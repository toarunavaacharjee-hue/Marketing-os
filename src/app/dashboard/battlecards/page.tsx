"use client";
import { useState } from "react";

const data = {
  "Acme": { s: "Brand awareness", w: "Slow onboarding", win: "Faster time-to-value", obj: "Switching cost -> phased rollout" },
  "RivalSoft": { s: "Enterprise logos", w: "Complex UX", win: "Easier adoption", obj: "Feature parity -> outcome focus" },
  "Nexus AI": { s: "AI narrative", w: "Limited GTM depth", win: "Full operating system", obj: "AI quality -> workflow + governance" }
};

export default function BattlecardsPage() {
  const [tab, setTab] = useState<keyof typeof data>("Acme");
  const b = data[tab];
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>Battlecards</h1>
      <div className="flex gap-2">{Object.keys(data).map(k=><button key={k} onClick={()=>setTab(k as keyof typeof data)} className={`rounded-xl px-3 py-2 text-sm ${tab===k?"bg-[#7c6cff] text-white":"border border-[#2a2e3f] bg-[#141420] text-[#f0f0f8]"}`}>{k}</button>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]"><div className="text-[#f0f0f8]">Strengths</div>{b.s}<div className="mt-3 text-[#f0f0f8]">Weaknesses</div>{b.w}</div>
        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4 text-sm text-[#9090b0]"><div className="text-[#f0f0f8]">Why We Win</div>{b.win}<div className="mt-3 text-[#f0f0f8]">Objection Handling</div>{b.obj}</div>
      </div>
      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-4">
        <div className="text-sm text-[#f0f0f8]">Add New Competitor</div>
        <div className="mt-2 grid gap-2 md:grid-cols-3"><input className="rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]" placeholder="Name"/><input className="rounded-xl border border-[#2a2e3f] bg-black/20 p-2 text-sm text-[#f0f0f8]" placeholder="Strength"/><button className="rounded-xl bg-[#b8ff6c] p-2 text-sm text-black">Add</button></div>
      </div>
    </div>
  );
}

