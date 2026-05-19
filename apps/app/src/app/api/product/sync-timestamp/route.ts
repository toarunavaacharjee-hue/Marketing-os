import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const environmentId = searchParams.get("environmentId");

    if (!environmentId) {
      return NextResponse.json({ error: "Missing environmentId query parameter." }, { status: 400 });
    }

    // Get the product_id for this environment
    const { data: envRow, error: envErr } = await supabase
      .from("product_environments")
      .select("product_id")
      .eq("id", environmentId)
      .maybeSingle<{ product_id: string }>();

    if (envErr) {
      return NextResponse.json({ error: envErr.message }, { status: 500 });
    }

    if (!envRow) {
      return NextResponse.json({ error: "Environment not found." }, { status: 404 });
    }

    // Get the product's updated_at and name
    const { data: productRow, error: productErr } = await supabase
      .from("products")
      .select("updated_at, name")
      .eq("id", envRow.product_id)
      .maybeSingle<{ updated_at: string; name: string }>();

    if (productErr) {
      return NextResponse.json({ error: productErr.message }, { status: 500 });
    }

    if (!productRow) {
      return NextResponse.json({ error: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({
      updated_at: productRow.updated_at,
      product_name: productRow.name
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
