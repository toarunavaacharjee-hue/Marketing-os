import { NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json()) as { product_id?: string; confirm_name?: string };
  const productId = (body.product_id ?? "").trim();
  const confirmName = (body.confirm_name ?? "").trim();
  if (!productId) return NextResponse.json({ error: "product_id is required." }, { status: 400 });

  const { data: product, error: productErr } = await supabase
    .from("products")
    .select("id,name,company_id")
    .eq("id", productId)
    .maybeSingle();
  if (productErr) return NextResponse.json({ error: productErr.message }, { status: 400 });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const companyId = String((product as any).company_id ?? "").trim();
  if (!companyId) return NextResponse.json({ error: "Product is missing company_id." }, { status: 400 });

  const { data: membership, error: memberErr } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 400 });

  const role = String((membership as any)?.role ?? "member");
  const canAdmin = role === "owner" || role === "admin";
  if (!canAdmin) {
    return NextResponse.json({ error: "Only workspace owners/admins can delete products." }, { status: 403 });
  }

  const expectedName = String((product as any).name ?? "").trim();
  if (expectedName && confirmName !== expectedName) {
    return NextResponse.json({ error: "Confirmation name does not match product name." }, { status: 400 });
  }

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  const reqCookies = req.headers.get("cookie") ?? "";
  if (reqCookies.includes(`${TENANT_COOKIE.productId}=${productId}`)) {
    res.cookies.set(TENANT_COOKIE.productId, "", { path: "/", sameSite: "lax", expires: new Date(0) });
  }
  return res;
}

