import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthCallbackPage({
  searchParams
}: {
  searchParams: { code?: string; next?: string };
}) {
  const supabase = createSupabaseServerClient();
  const code = searchParams.code;
  const next = searchParams.next ?? "/dashboard/settings";

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  redirect(next);
}

