import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSelectedCompanyId } from "@/lib/companyContext";
import { logActivity } from "@/lib/analytics/logActivity";

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false });

    const body = (await req.json()) as { module?: string; path?: string };
    const companyId = await getSelectedCompanyId();

    logActivity({
      userId: user.id,
      companyId,
      event: "page_view",
      module: body.module ?? null,
      metadata: { path: body.path ?? "" }
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
