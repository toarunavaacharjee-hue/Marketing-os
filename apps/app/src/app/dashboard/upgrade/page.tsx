import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import UpgradeClient from "@/app/dashboard/upgrade/UpgradeClient";

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

  return <UpgradeClient nextHref={next} />;
}

