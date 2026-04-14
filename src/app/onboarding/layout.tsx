import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectIfUnverifiedEmail } from "@/lib/auth/emailVerification";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  redirectIfUnverifiedEmail(user);

  // If the user already belongs to any workspace/product, onboarding should not block them.
  const [{ count: companyCount }, { count: productCount }] = await Promise.all([
    supabase
      .from("company_members")
      .select("company_id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("product_members")
      .select("product_id", { count: "exact", head: true })
      .eq("user_id", user.id)
  ]);

  if ((companyCount ?? 0) > 0 || (productCount ?? 0) > 0) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
