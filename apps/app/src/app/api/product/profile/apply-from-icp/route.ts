import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSelectedProductId } from "@/lib/productContext";

function asText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

type ProductProfileFromIcp = {
  name?: string;
  website_url?: string;
  category?: string;
  icp_summary?: string;
  positioning_summary?: string;
};

/** Merges non-empty extracted fields into the current product (does not touch competitors). */
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const productId = await getSelectedProductId();
    if (!productId) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const body = (await req.json()) as ProductProfileFromIcp;

    const { data: current, error: curErr } = await supabase
      .from("products")
      .select("name,website_url,category,icp_summary,positioning_summary")
      .eq("id", productId)
      .maybeSingle();

    if (curErr || !current) {
      return NextResponse.json({ error: curErr?.message ?? "Product not found." }, { status: 404 });
    }

    const c = current as Record<string, unknown>;
    const pick = (incoming: string | undefined, existing: unknown): string | null => {
      const inc = asText(incoming ?? "");
      if (inc.length > 0) return inc;
      if (typeof existing === "string" && existing.trim()) return existing.trim();
      return null;
    };

    const name = pick(body.name, c.name) ?? "";
    const website_url = pick(body.website_url, c.website_url);
    const category = pick(body.category, c.category);
    const icp_summary = pick(body.icp_summary, c.icp_summary);
    const positioning_summary = pick(body.positioning_summary, c.positioning_summary);

    if (!name.trim()) {
      return NextResponse.json(
        { error: "Product name cannot be empty. Set a name in Product profile first." },
        { status: 400 }
      );
    }

    const { error: updErr } = await supabase
      .from("products")
      .update({
        name,
        website_url,
        category,
        icp_summary,
        positioning_summary
      })
      .eq("id", productId);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
