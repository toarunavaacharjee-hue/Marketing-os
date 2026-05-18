"use client";

export function SkeletonLine({ width = "full", height = "4" }: { width?: string; height?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface3 w-${width} h-${height}`}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 h-4 w-1/3 animate-pulse rounded-md bg-surface3" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded-md bg-surface3"
            style={{ width: `${85 - i * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {["Planning", "In Progress", "In Review", "Live"].map((col) => (
        <div key={col} className="rounded-2xl border border-border bg-surface p-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="h-4 w-20 animate-pulse rounded-md bg-surface3" />
            <div className="h-6 w-10 animate-pulse rounded-lg bg-surface3" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: col === "Planning" ? 2 : 1 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded-md bg-surface3" />
                <div className="mt-2 flex gap-1">
                  <div className="h-5 w-14 animate-pulse rounded-full bg-surface3" />
                  <div className="h-5 w-10 animate-pulse rounded-full bg-surface3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonSegmentList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded-full bg-surface3" />
              <div className="h-4 w-32 animate-pulse rounded-md bg-surface3" />
            </div>
            <div className="h-8 w-28 animate-pulse rounded-xl bg-surface3" />
          </div>
        </div>
      ))}
    </div>
  );
}
