import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import type { PositioningCanvasValue } from "@/lib/positioningStudio";

type VersionRow = {
  id: string;
  version_number: number;
  status: string;
  value_json: unknown;
  submitted_by: string | null;
  approved_by: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  review_due_at: string | null;
  created_at: string;
};

async function requireProductRole(productId: string, userId: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("product_members")
    .select("role")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle<{ role: string }>();
  const role = (data?.role ?? "").toLowerCase();
  return { role, isAdmin: role === "owner" || role === "admin" };
}

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

    const { data: envRow, error: envErr } = await supabase
      .from("product_environments")
      .select("approved_positioning_version_id")
      .eq("id", environmentId)
      .maybeSingle();

    if (envErr) return NextResponse.json({ error: envErr.message }, { status: 500 });

    const { data: rows, error } = await supabase
      .from("positioning_versions")
      .select(
        "id,version_number,status,value_json,submitted_by,approved_by,submitted_at,approved_at,review_due_at,created_at"
      )
      .eq("environment_id", environmentId)
      .order("version_number", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { isAdmin } = await requireProductRole(productId, user.id);

    return NextResponse.json({
      productId,
      environmentId,
      is_admin: isAdmin,
      approved_positioning_version_id: (envRow as { approved_positioning_version_id?: string | null } | null)
        ?.approved_positioning_version_id ?? null,
      versions: (rows ?? []) as VersionRow[]
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    const ctx = await getDefaultEnvironmentIdForSelectedProduct();
    if (!ctx) return NextResponse.json({ error: "No product selected." }, { status: 400 });

    const { productId, environmentId } = ctx;
    const { isAdmin } = await requireProductRole(productId, user.id);

    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      value_json?: PositioningCanvasValue;
      version_id?: string;
      review_due_at?: string | null;
    };

    const action = (body.action ?? "").trim();
    if (!action) return NextResponse.json({ error: "action is required." }, { status: 400 });

    if (action === "snapshot_draft") {
      if (!body.value_json || typeof body.value_json !== "object") {
        return NextResponse.json({ error: "value_json is required." }, { status: 400 });
      }

      const { data: maxRow } = await supabase
        .from("positioning_versions")
        .select("version_number")
        .eq("environment_id", environmentId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle<{ version_number: number }>();

      const nextNum = (maxRow?.version_number ?? 0) + 1;

      const ins = await supabase
        .from("positioning_versions")
        .insert({
          product_id: productId,
          environment_id: environmentId,
          version_number: nextNum,
          status: "draft",
          value_json: body.value_json as unknown
        })
        .select("id,version_number,status,created_at")
        .single();

      if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
      return NextResponse.json({ ok: true, version: ins.data });
    }

    const versionId = (body.version_id ?? "").trim();
    if (!versionId) return NextResponse.json({ error: "version_id is required." }, { status: 400 });

    const { data: ver, error: vErr } = await supabase
      .from("positioning_versions")
      .select("id,environment_id,product_id,status")
      .eq("id", versionId)
      .maybeSingle<{ id: string; environment_id: string; product_id: string; status: string }>();

    if (vErr || !ver) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    if (ver.environment_id !== environmentId || ver.product_id !== productId) {
      return NextResponse.json({ error: "Version does not match the selected product." }, { status: 400 });
    }

    if (action === "submit") {
      if (ver.status !== "draft") {
        return NextResponse.json({ error: "Only draft versions can be submitted for review." }, { status: 400 });
      }
      const up = await supabase
        .from("positioning_versions")
        .update({
          status: "pending_review",
          submitted_by: user.id,
          submitted_at: new Date().toISOString()
        })
        .eq("id", versionId);
      if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (action === "approve") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Only product owners/admins can approve positioning." }, { status: 403 });
      }
      if (ver.status !== "pending_review" && ver.status !== "draft") {
        return NextResponse.json({ error: "Only draft or pending_review versions can be approved." }, { status: 400 });
      }

      const reviewDue =
        typeof body.review_due_at === "string" && body.review_due_at.trim()
          ? new Date(body.review_due_at).toISOString()
          : null;

      const now = new Date().toISOString();

      const sup = await supabase
        .from("positioning_versions")
        .update({ status: "superseded" })
        .eq("environment_id", environmentId)
        .eq("status", "approved");
      if (sup.error) return NextResponse.json({ error: sup.error.message }, { status: 500 });

      const up = await supabase
        .from("positioning_versions")
        .update({
          status: "approved",
          approved_by: user.id,
          approved_at: now,
          review_due_at: reviewDue
        })
        .eq("id", versionId);
      if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

      const envUp = await supabase
        .from("product_environments")
        .update({ approved_positioning_version_id: versionId })
        .eq("id", environmentId);
      if (envUp.error) return NextResponse.json({ error: envUp.error.message }, { status: 500 });

      return NextResponse.json({ ok: true, approved_positioning_version_id: versionId });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
