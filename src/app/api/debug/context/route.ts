import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const h = await headers();
  const cookieStore = await cookies();
  const selectedCompanyId = cookieStore.get(TENANT_COOKIE.companyId)?.value ?? null;
  const selectedProductId = cookieStore.get(TENANT_COOKIE.productId)?.value ?? null;

  const [{ data: companyMemberships, error: cmErr }, { data: productMemberships, error: pmErr }] =
    await Promise.all([
      supabase.from("company_members").select("company_id, role").eq("user_id", user.id),
      supabase.from("product_members").select("product_id, role").eq("user_id", user.id)
    ]);

  return NextResponse.json({
    ok: true,
    request: {
      host: h.get("host"),
      forwardedHost: h.get("x-forwarded-host"),
      url: h.get("x-url") ?? null
    },
    auth: {
      user_id: user.id,
      email: user.email ?? null
    },
    tenant: {
      selectedCompanyId,
      selectedProductId
    },
    company_memberships: {
      count: companyMemberships?.length ?? 0,
      error: cmErr?.message ?? null,
      rows: companyMemberships ?? []
    },
    product_memberships: {
      count: productMemberships?.length ?? 0,
      error: pmErr?.message ?? null,
      rows: productMemberships ?? []
    }
  });
}

