import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json()) as { company_id?: string; name?: string };
  const companyId = (body.company_id ?? "").trim();
  const name = (body.name ?? "").trim();
  if (!companyId) return NextResponse.json({ error: "company_id is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  if (name.length > 120) return NextResponse.json({ error: "Workspace name is too long." }, { status: 400 });

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
    return NextResponse.json(
      { error: "Only workspace owners/admins can edit workspace settings." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("companies").update({ name }).eq("id", companyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

