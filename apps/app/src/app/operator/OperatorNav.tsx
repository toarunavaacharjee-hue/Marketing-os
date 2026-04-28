import Link from "next/link";

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={[
        "rounded-[var(--radius2)] px-3 py-2 text-xs font-semibold transition",
        active
          ? "bg-[var(--accent)] text-white shadow-[0_0_0_1px_rgba(124,108,255,0.25)]"
          : "border border-[var(--border)] bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface3)]"
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function OperatorNav({ active }: { active: "overview" | "users" | "health" | "audit" }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2">
      <NavLink href="/operator" label="Overview" active={active === "overview"} />
      <NavLink href="/operator/users" label="Users" active={active === "users"} />
      <NavLink href="/operator/health" label="Tool health" active={active === "health"} />
      <NavLink href="/operator/audit" label="Audit log" active={active === "audit"} />
    </div>
  );
}

