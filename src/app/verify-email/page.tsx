import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VerifyEmailClient } from "@/app/verify-email/VerifyEmailClient";

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: { email?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user?.email_confirmed_at) {
    redirect("/dashboard");
  }

  const qEmail = typeof searchParams.email === "string" ? searchParams.email.trim() : "";
  const initialEmail = user?.email ?? qEmail;
  const hasSession = Boolean(user);

  return <VerifyEmailClient initialEmail={initialEmail} hasSession={hasSession} />;
}
