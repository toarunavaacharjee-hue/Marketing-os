import { NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json()) as { company_id?: string; confirm_name?: string };
  const companyId = (body.company_id ?? "").trim();
  const confirmName = (body.confirm_name ?? "").trim();
  if (!companyId) return NextResponse.json({ error: "company_id is required." }, { status: 400 });

  const { data: membership, error: memberErr } = await supabase
    .from("company_members")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 400 });

  const role = String((membership as any)?.role ?? "member");
  const isOwner = role === "owner";
  if (!isOwner) return NextResponse.json({ error: "Only the workspace owner can delete a workspace." }, { status: 403 });

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("id,name")
    .eq("id", companyId)
    .maybeSingle();
  if (companyErr) return NextResponse.json({ error: companyErr.message }, { status: 400 });
  if (!company) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });

  const expectedName = String((company as any).name ?? "").trim();
  if (expectedName && confirmName !== expectedName) {
    return NextResponse.json(
      { error: "Confirmation name does not match workspace name." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(TENANT_COOKIE.companyId, "", { path: "/", sameSite: "lax", expires: new Date(0) });
  res.cookies.set(TENANT_COOKIE.productId, "", { path: "/", sameSite: "lax", expires: new Date(0) });
  return res;
}

