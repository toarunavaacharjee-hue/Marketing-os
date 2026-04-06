import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const selected = await getDefaultEnvironmentIdForSelectedProduct();
    if (!selected) return NextResponse.json({ error: "No product selected." }, { status: 400 });
    const { productId, environmentId } = selected;

    const { data: rows, error } = await supabase
      .from("research_scans")
      .select("id,status,summary,result_json,created_at")
      .eq("environment_id", environmentId)
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("[api/research/latest] supabase error:", error.message, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const scan = rows?.[0] ?? null;
    return NextResponse.json({ scan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

