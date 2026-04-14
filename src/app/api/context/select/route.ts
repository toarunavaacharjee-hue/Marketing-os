import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TENANT_COOKIE } from "@/lib/tenant";

function asId(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    companyId?: unknown;
    productId?: unknown;
  };

  const companyId = asId(body.companyId);
  const productId = asId(body.productId);
  if (!companyId || !productId) {
    return NextResponse.json({ error: "companyId and productId are required." }, { status: 400 });
  }

  // Prevent setting arbitrary IDs: verify the user is a member of both.
  const [{ count: companyOk }, { count: productOk }] = await Promise.all([
    supabase
      .from("company_members")
      .select("company_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("company_id", companyId),
    supabase
      .from("product_members")
      .select("product_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("product_id", productId)
  ]);

  if ((companyOk ?? 0) === 0 || (productOk ?? 0) === 0) {
    return NextResponse.json({ error: "You don't have access to that workspace/product." }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30 // 30 days
  };

  res.cookies.set(TENANT_COOKIE.companyId, companyId, cookieBase);
  res.cookies.set(TENANT_COOKIE.productId, productId, cookieBase);
  return res;
}

