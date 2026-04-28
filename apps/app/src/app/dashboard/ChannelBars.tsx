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
            <div className="text-heading">{it.label}</div>
            <div className="text-text2">{it.value}%</div>
          </div>
          <div className="h-2 w-full rounded-full bg-surface3 ring-1 ring-border">
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

