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

export function SkeletonMarketResearch() {
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-52 animate-pulse rounded-lg bg-surface3" />
          <div className="h-4 w-72 animate-pulse rounded-md bg-surface3" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 animate-pulse rounded-xl bg-surface3" />
          <div className="h-9 w-28 animate-pulse rounded-xl bg-surface3" />
        </div>
      </div>
      {/* Main grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
          <div className="mb-3 h-4 w-48 animate-pulse rounded-md bg-surface3" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-surface3" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded-md bg-surface3" />
                  <div className="h-3 w-full animate-pulse rounded-md bg-surface3" />
                  <div className="h-3 w-1/3 animate-pulse rounded-md bg-surface3" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 h-4 w-36 animate-pulse rounded-md bg-surface3" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-surface3" />
            <div className="mt-3 h-32 animate-pulse rounded-xl bg-surface3" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="mb-3 h-4 w-40 animate-pulse rounded-md bg-surface3" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-3 w-40 animate-pulse rounded-md bg-surface3" />
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-surface3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonIcpSegmentation() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface3" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 h-4 w-40 animate-pulse rounded-md bg-surface3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mt-3">
              <div className="mb-1.5 flex justify-between">
                <div className="h-3 w-24 animate-pulse rounded-md bg-surface3" />
                <div className="h-3 w-8 animate-pulse rounded-md bg-surface3" />
              </div>
              <div className="h-2 animate-pulse rounded-full bg-surface3" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-lg bg-surface3" />
          <div className="h-28 animate-pulse rounded-lg bg-surface3" />
        </div>
      </div>
    </div>
  );
}
