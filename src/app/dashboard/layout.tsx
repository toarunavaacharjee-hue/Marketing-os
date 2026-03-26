import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/app/dashboard/DashboardShell";
import { UserProvider } from "@/lib/user/UserProvider";
import { cookies } from "next/headers";
import { TENANT_COOKIE } from "@/lib/tenant";

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
    .select("name,company,plan")
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

  const { data: products } = await supabase
    .from("products")
    .select("id,name,company_id")
    .in(
      "company_id",
      companies.map((c) => c.id)
    );

  const allProducts =
    products?.map((p) => ({
      id: p.id as string,
      name: p.name as string,
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

