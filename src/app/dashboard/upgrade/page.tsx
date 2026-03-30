import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function UpgradePage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = (await searchParams) ?? {};
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";

  return (
    <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
      <div className="text-2xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
        Upgrade required
      </div>
      <div className="mt-2 text-sm text-[#9090b0]">
        Your current plan doesn’t include that module. Upgrade to Growth or Enterprise to unlock all modules and remove
        AI limits.
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/pricing" className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black">
          View pricing
        </Link>
        <Link
          href={next}
          className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
        >
          Go back
        </Link>
        <Link
          href="/dashboard/support"
          className="rounded-xl border border-[#2a2e3f] bg-black/20 px-4 py-2 text-sm font-medium text-[#f0f0f8] hover:bg-white/5"
        >
          Contact support
        </Link>
      </div>
    </div>
  );
}

