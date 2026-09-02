import type { ReactNode } from "react";
import Link from "next/link";

// ─── ModuleShell ──────────────────────────────────────────────────────────────
// Wraps each module page with a consistent top-level layout:
//   PageHeader → optional filter bar → content
//
// Usage (server or client component):
//   <ModuleShell
//     title="Market Research"
//     subtitle="Run AI scans to surface competitive intelligence."
//     badge={<span className="hs-badge hs-badge-new">NEW</span>}
//     actions={<button className="hs-btn hs-btn-primary">Run scan</button>}
//   >
//     {children}
//   </ModuleShell>

type ModuleShellProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  /** Primary + secondary action buttons rendered in the header right column */
  actions?: ReactNode;
  /** Content below the header but above the main body (e.g. tab strip, filter bar) */
  toolbar?: ReactNode;
  /** Breadcrumb trail — rendered above the title */
  breadcrumb?: ReactNode;
  children: ReactNode;
};

export function ModuleShell({
  title,
  subtitle,
  badge,
  actions,
  toolbar,
  breadcrumb,
  children,
}: ModuleShellProps) {
  return (
    <div className="space-y-5">
      {/* Header row */}
      <div>
        {breadcrumb && (
          <div className="mb-2 flex items-center gap-1.5 text-[12px] text-text2">
            {breadcrumb}
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold leading-tight tracking-[-0.2px] text-heading">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="mt-1 max-w-2xl text-[13px] leading-[1.55] text-text2">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
        {toolbar && <div className="mt-4">{toolbar}</div>}
      </div>

      {/* Page body */}
      {children}
    </div>
  );
}

// ─── ModuleCard ───────────────────────────────────────────────────────────────
// Standard card used inside module pages. Accepts an optional header row.

type ModuleCardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Left accent color class, e.g. "border-l-primary" */
  accent?: string;
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
};

export function ModuleCard({
  title,
  subtitle,
  actions,
  accent,
  padding = "md",
  children,
  className = "",
}: ModuleCardProps) {
  const pad = padding === "sm" ? "p-4" : padding === "lg" ? "p-6" : "p-5";
  const accentCls = accent ? `border-l-4 ${accent}` : "";
  return (
    <div className={`hs-card ${accentCls} ${className}`}>
      {(title || actions) && (
        <div className={`${pad} border-b border-border`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              {title && (
                <div className="text-[14px] font-semibold text-heading">{title}</div>
              )}
              {subtitle && (
                <div className="mt-0.5 text-[12px] text-text2">{subtitle}</div>
              )}
            </div>
            {actions && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
            )}
          </div>
        </div>
      )}
      <div className={pad}>{children}</div>
    </div>
  );
}

// ─── ModuleKpiStrip ───────────────────────────────────────────────────────────
// 2–4 KPI cards in a responsive grid. Used at the top of most modules.

type KpiItem = {
  label: string;
  value: string | number;
  delta?: string;
  tone?: "up" | "down" | "neutral" | "purple";
  icon?: ReactNode;
};

export function ModuleKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className={`grid gap-4 ${
      items.length === 2 ? "sm:grid-cols-2" :
      items.length === 3 ? "sm:grid-cols-3" :
                           "grid-cols-2 sm:grid-cols-4"
    }`}>
      {items.map((kpi, i) => {
        const deltaColor =
          kpi.tone === "up"     ? "text-teal"    :
          kpi.tone === "down"   ? "text-red"     :
          kpi.tone === "purple" ? "text-primary" :
                                   "text-text2";
        return (
          <div key={i} className="hs-card hs-card-hover flex flex-col gap-1 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text3">{kpi.label}</span>
              {kpi.icon && <span className="text-text3 opacity-60">{kpi.icon}</span>}
            </div>
            <div className="mt-1 text-[30px] font-extrabold leading-none tracking-tight text-heading">
              {kpi.value}
            </div>
            {kpi.delta && (
              <div className={`text-[12px] font-semibold ${deltaColor}`}>{kpi.delta}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ModuleTable ──────────────────────────────────────────────────────────────
// Premium table shell — headers, body, hover states.
// Wrap rows (<tr>) as children of <tbody> inside this component.

type ColDef = {
  label: string;
  width?: string;
  align?: "left" | "right" | "center";
};

export function ModuleTable({
  cols,
  children,
  loading = false,
  minWidth = "640px",
}: {
  cols: ColDef[];
  children: ReactNode;
  loading?: boolean;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-[13px]" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border bg-surface2/70">
            {cols.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text2 ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                }`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {cols.map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="hs-skeleton h-4 rounded" style={{ width: j === 0 ? "60%" : "40%" }} />
                  </td>
                ))}
              </tr>
            ))
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── ModuleEmptyState ─────────────────────────────────────────────────────────
// Full-width empty state with icon, headline, body, and CTA.

type EmptyStateAction = {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

export function ModuleEmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface2/40 px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm text-2xl">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-heading">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-text2">{description}</p>
      )}
      {actions && actions.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actions.map((a, i) => {
            const cls = a.variant === "secondary"
              ? "hs-btn hs-btn-secondary"
              : "hs-btn hs-btn-primary";
            return a.href ? (
              <Link key={i} href={a.href} className={cls}>{a.label}</Link>
            ) : (
              <button key={i} type="button" onClick={a.onClick} className={cls}>{a.label}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ModuleStatusBadge ────────────────────────────────────────────────────────
// Canonical status badge used across all modules.

const STATUS_MAP: Record<string, { cls: string; dot?: string }> = {
  // Positive
  live:        { cls: "hs-badge hs-badge-success",  dot: "bg-teal"    },
  published:   { cls: "hs-badge hs-badge-success",  dot: "bg-teal"    },
  shipped:     { cls: "hs-badge hs-badge-success",  dot: "bg-teal"    },
  done:        { cls: "hs-badge hs-badge-success",  dot: "bg-teal"    },
  active:      { cls: "hs-badge hs-badge-success",  dot: "bg-teal"    },
  approved:    { cls: "hs-badge hs-badge-success",  dot: "bg-teal"    },
  connected:   { cls: "hs-badge hs-badge-success",  dot: "bg-teal"    },
  // In progress
  draft:       { cls: "hs-badge hs-badge-warn",     dot: "bg-amber"   },
  "in-draft":  { cls: "hs-badge hs-badge-warn",     dot: "bg-amber"   },
  scheduled:   { cls: "hs-badge hs-badge-warn",     dot: "bg-amber"   },
  "in-progress":{ cls: "hs-badge hs-badge-warn",    dot: "bg-amber"   },
  "in-review": { cls: "hs-badge hs-badge-warn",     dot: "bg-amber"   },
  planning:    { cls: "hs-badge hs-badge-warn",     dot: "bg-amber"   },
  // Brand purple
  open:        { cls: "hs-badge hs-badge-new",      dot: "bg-primary" },
  queued:      { cls: "hs-badge hs-badge-new",      dot: "bg-primary" },
  pending:     { cls: "hs-badge hs-badge-new",      dot: "bg-primary" },
  // Error/danger
  overdue:     { cls: "hs-badge hs-badge-error",    dot: "bg-red"     },
  paused:      { cls: "hs-badge hs-badge-error",    dot: "bg-red"     },
  failed:      { cls: "hs-badge hs-badge-error",    dot: "bg-red"     },
  // Neutral
  reference:   { cls: "hs-badge hs-badge-neutral"                     },
  briefed:     { cls: "hs-badge hs-badge-neutral"                     },
  outline:     { cls: "hs-badge hs-badge-neutral"                     },
};

export function ModuleStatusBadge({ status }: { status?: string }) {
  const key = (status ?? "").toLowerCase().replace(/\s+/g, "-");
  const config = STATUS_MAP[key];
  if (!config) {
    return (
      <span className="hs-badge hs-badge-neutral">{status ?? "—"}</span>
    );
  }
  return (
    <span className={config.cls}>
      {config.dot && <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />}
      {status}
    </span>
  );
}

// ─── ModuleFilterBar ──────────────────────────────────────────────────────────
// HubSpot-style horizontal filter bar: search + optional selects + optional pills.

export function ModuleFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
      {children}
    </div>
  );
}

// Search input for inside a ModuleFilterBar
export function FilterSearch({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-[180px] flex-1">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text3"
        fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
      >
        <circle cx={11} cy={11} r={8} /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-surface2 py-1.5 pl-8 pr-3 text-[13px] text-heading placeholder:text-text3 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15"
      />
    </div>
  );
}

// Select dropdown for inside a ModuleFilterBar
export function FilterSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-border bg-surface2 px-3 py-1.5 text-[13px] text-heading focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
