import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectIfUnverifiedEmail } from "@/lib/auth/emailVerification";

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

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) redirectIfUnverifiedEmail(user);

  redirect(next);
}

