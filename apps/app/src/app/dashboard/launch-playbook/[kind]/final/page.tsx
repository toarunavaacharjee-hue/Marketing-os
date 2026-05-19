import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { FinalLaunchPackClient } from "@/app/dashboard/launch-playbook/FinalLaunchPackClient";
import type { LaunchKind } from "@/app/dashboard/launch-playbook/LaunchPlaybookDetailClient";

export default async function FinalLaunchPackPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const safeKind: LaunchKind = kind === "feature-launch" ? "feature-launch" : "product-launch";

  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  const supabase = createSupabaseServerClient();

  const { data: run } = await supabase
    .from("launch_playbook_runs")
    .select("id,kind,status,created_at")
    .eq("environment_id", ctx.environmentId)
    .eq("kind", safeKind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run?.id) notFound();

  const { data: artifacts } = await supabase
    .from("artifact_library_items")
    .select("id,artifact_type,title,status,created_at,content_json,source_run_id")
    .eq("environment_id", ctx.environmentId)
    .eq("source_run_id", run.id)
    .order("created_at", { ascending: true });

  return (
    <FinalLaunchPackClient
      kind={safeKind}
      run={{
        id: run.id as string,
        status: (run as any).status as string,
        created_at: (run as any).created_at as string
      }}
      artifacts={(artifacts ?? []) as any}
    />
  );
}

