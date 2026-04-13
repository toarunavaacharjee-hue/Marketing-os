import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { computeProfileCompleteness } from "@/lib/profileCompleteness";
import { POSITIONING_KEY, POSITIONING_MODULE, type PositioningCanvasValue } from "@/lib/positioningStudio";

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { productId, environmentId } = ctx;

    const { data: product, error: pErr } = await supabase
      .from("products")
      .select("id,name,website_url,icp_summary,positioning_summary")
      .eq("id", productId)
      .maybeSingle();

    if (pErr || !product) {
      return NextResponse.json({ error: pErr?.message ?? "Product not found." }, { status: 404 });
    }

    const { data: ms } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", POSITIONING_MODULE)
      .eq("key", POSITIONING_KEY)
      .maybeSingle();

    const raw = ms?.value_json as Partial<PositioningCanvasValue> | null;
    const canvas =
      raw?.doc && typeof raw.doc === "object"
        ? ({
            doc: raw.doc,
            health: raw.health,
            revision: raw.revision,
            history: raw.history
          } as PositioningCanvasValue)
        : null;

    const { data: envRow } = await supabase
      .from("product_environments")
      .select("approved_positioning_version_id")
      .eq("id", environmentId)
      .maybeSingle();

    const hasApproved = Boolean((envRow as { approved_positioning_version_id?: string | null } | null)?.approved_positioning_version_id);

    const result = computeProfileCompleteness({
      productName: product.name,
      websiteUrl: product.website_url,
      icpSummary: product.icp_summary,
      positioningSummary: product.positioning_summary,
      canvas,
      hasApprovedPositioningVersion: hasApproved
    });

    return NextResponse.json({
      ...result,
      productId,
      environmentId
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
