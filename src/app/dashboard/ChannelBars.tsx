"use client";

export function ChannelBars({
  items
}: {
  items: { label: string; value: number; color: string }[];
}) {
  return (
    <div className="space-y-4">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="text-[#f0f0f8]">{it.label}</div>
            <div className="text-[#9090b0]">{it.value}%</div>
          </div>
          <div className="h-2 w-full rounded-full bg-black/30 ring-1 ring-[#2a2e3f]">
            <div
              className="h-2 rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, it.value))}%`,
                background: it.color
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

