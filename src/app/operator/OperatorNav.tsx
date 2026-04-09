import Link from "next/link";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface3)]"
    >
      {label}
    </Link>
  );
}

export default function OperatorNav({ active }: { active: "overview" | "users" | "health" | "audit" }) {
  return (
    <div className="flex flex-wrap gap-2">
      <NavLink href="/operator" label={active === "overview" ? "Overview (active)" : "Overview"} />
      <NavLink href="/operator/users" label={active === "users" ? "Users (active)" : "Users"} />
      <NavLink href="/operator/health" label={active === "health" ? "Tool health (active)" : "Tool health"} />
      <NavLink href="/operator/audit" label={active === "audit" ? "Audit log (active)" : "Audit log"} />
    </div>
  );
}

