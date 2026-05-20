import type { ReactNode } from "react";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  /** Extra content rendered below the title row (e.g. a progress bar or tab strip) */
  below?: ReactNode;
};

/**
 * Consistent HubSpot-style page header used across all dashboard modules.
 *
 * Usage:
 *   <PageHeader
 *     title="Market Research"
 *     subtitle="Run AI-powered scans to surface competitive intelligence."
 *     badge={<span className="hs-badge-new">NEW</span>}
 *     actions={<><button className="hs-btn-secondary">Export</button><button className="hs-btn-primary">Run scan</button></>}
 *   />
 */
export function PageHeader({ title, subtitle, badge, actions, below }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.2px] text-heading">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-text2">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {below && <div className="mt-4">{below}</div>}
    </div>
  );
}

/** Reusable section header inside a page (h2-level) */
export function SectionHeader({
  title,
  subtitle,
  actions
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-heading">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[12px] text-text2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Reusable stat card (used in Overview KPI strip etc.) */
export function StatCard({
  label,
  value,
  delta,
  icon,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
  tone?: "up" | "down" | "neutral" | "purple";
}) {
  const deltaColor =
    tone === "up"      ? "text-teal"    :
    tone === "down"    ? "text-red"     :
    tone === "purple"  ? "text-primary" :
                         "text-text2";
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-text3">{label}</span>
        {icon && <span className="text-text3">{icon}</span>}
      </div>
      <div className="mt-1 text-[28px] font-extrabold leading-none tracking-tight text-heading">
        {value}
      </div>
      {delta && (
        <div className={`text-[12px] font-semibold ${deltaColor}`}>{delta}</div>
      )}
    </div>
  );
}
