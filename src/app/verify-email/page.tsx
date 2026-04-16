import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VerifyEmailClient } from "@/app/verify-email/VerifyEmailClient";

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: { email?: string; next?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const next = typeof searchParams.next === "string" && searchParams.next.trim() ? searchParams.next.trim() : "/dashboard";

  if (user?.email_confirmed_at) {
    redirect(next);
  }

  const qEmail = typeof searchParams.email === "string" ? searchParams.email.trim() : "";
  const initialEmail = user?.email ?? qEmail;
  const hasSession = Boolean(user);

  return <VerifyEmailClient initialEmail={initialEmail} hasSession={hasSession} next={next} />;
}
