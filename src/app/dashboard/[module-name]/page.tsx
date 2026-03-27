import Link from "next/link";

/**
 * Fallback for /dashboard/:slug when no more-specific route exists.
 * Real modules live in their own route folders (e.g. /dashboard/campaigns).
 */
export default function UnknownDashboardModule({
  params
}: {
  params: { "module-name": string };
}) {
  const slug = params["module-name"];
  return (
    <div className="space-y-4">
      <h1 className="text-3xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
        Unknown route
      </h1>
      <p className="text-sm text-[#9090b0]">
        There is no page at <span className="text-[#f0f0f8]">/dashboard/{slug}</span>. Use the sidebar to open a module.
      </p>
      <Link href="/dashboard" className="text-[#7c6cff] hover:underline">
        ← Command Centre
      </Link>
    </div>
  );
}
