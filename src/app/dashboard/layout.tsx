import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { UserProvider } from "@/lib/user/UserProvider";
import { cookies } from "next/headers";
import { TENANT_COOKIE } from "@/lib/tenant";
import { getCompanyPlan } from "@/lib/companyContext";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name,company")
    .eq("id", user.id)
    .single();

  // Multi-company + product context
  const cookieStore = await cookies();
  const companyIdCookie = cookieStore.get(TENANT_COOKIE.companyId)?.value ?? null;
  const productIdCookie = cookieStore.get(TENANT_COOKIE.productId)?.value ?? null;

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id, role, companies(name)")
    .eq("user_id", user.id);

  const companies =
    memberships?.map((m) => ({
      id: m.company_id as string,
      name: (m as any).companies?.name ?? "Company"
    })) ?? [];

  if (companies.length === 0) {
    redirect("/onboarding");
  }

  const selectedCompanyId = companyIdCookie ?? companies[0].id;
  const companyPlan = await getCompanyPlan(selectedCompanyId);

  const { data: productMemberships } = await supabase
    .from("product_members")
    .select("product_id, role, products(id,name,company_id)")
    .eq("user_id", user.id);

  const allProducts =
    productMemberships
      ?.map((pm) => (pm as any).products)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id as string,
        name: (p.name as string) ?? "Product",
        company_id: p.company_id as string
      })) ?? [];

  const selectedProductId =
    productIdCookie ??
    allProducts.find((p) => p.company_id === selectedCompanyId)?.id ??
    null;

  if (!selectedProductId) {
    redirect("/onboarding");
  }

  return (
    <UserProvider>
      <DashboardShell
        profile={profile ?? null}
        companyPlan={companyPlan}
        companies={companies}
        products={allProducts}
        selectedCompanyId={selectedCompanyId}
        selectedProductId={selectedProductId}
      >
        {children}
      </DashboardShell>
    </UserProvider>
  );
}

