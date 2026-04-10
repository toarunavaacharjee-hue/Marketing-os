import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectIfUnverifiedEmail } from "@/lib/auth/emailVerification";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (user) redirectIfUnverifiedEmail(user);
  return <>{children}</>;
}
