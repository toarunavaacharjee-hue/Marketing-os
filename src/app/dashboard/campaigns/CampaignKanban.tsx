"use client";

import { useState } from "react";

type ColumnKey = "planning" | "in-progress" | "in-review" | "live";
type Card = { id: string; title: string; tags: string[] };

const initial: Record<ColumnKey, Card[]> = {
  planning: [
    { id: "c1", title: "LinkedIn ICP refresh", tags: ["LinkedIn", "TOFU"] },
    { id: "c2", title: "Q2 webinar promotion", tags: ["Webinar", "Email"] }
  ],
  "in-progress": [
    { id: "c3", title: "Meta retargeting creatives", tags: ["Meta", "BOFU"] }
  ],
  "in-review": [
    { id: "c4", title: "GTM launch checklist campaign", tags: ["GTM", "Ops"] }
  ],
  live: [
    { id: "c5", title: "Content syndication sprint", tags: ["Content", "MQL"] }
  ]
};

const columns: { key: ColumnKey; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "in-progress", label: "In Progress" },
  { key: "in-review", label: "In Review" },
  { key: "live", label: "Live" }
];

export function CampaignKanban() {
  const [board, setBoard] = useState(initial);

  function onDrop(target: ColumnKey, cardId: string) {
    setBoard((prev) => {
      let moved: Card | null = null;
      const next = { ...prev };
      (Object.keys(next) as ColumnKey[]).forEach((k) => {
        next[k] = next[k].filter((c) => {
          if (c.id === cardId) moved = c;
          return c.id !== cardId;
        });
      });
      if (moved) next[target] = [...next[target], moved];
      return next;
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {columns.map((col) => (
        <div
          key={col.key}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const id = e.dataTransfer.getData("text/plain");
            if (id) onDrop(col.key, id);
          }}
          className="min-h-[360px] rounded-2xl border border-[#2a2e3f] bg-[#141420] p-3"
        >
          <div className="mb-3 text-sm text-[#f0f0f8]">
            {col.label} <span className="text-[#9090b0]">({board[col.key].length})</span>
          </div>
          <div className="space-y-2">
            {board[col.key].map((card) => (
              <div
                key={card.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
                className="cursor-move rounded-xl border border-[#2a2e3f] bg-[#1e1e2e] p-3"
              >
                <div className="text-sm text-[#f0f0f8]">{card.title}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-[#2a2e3f] px-2 py-0.5 text-[11px] text-[#9090b0]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

