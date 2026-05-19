import { notFound, redirect } from "next/navigation";
import { getDefaultEnvironmentIdForSelectedProduct } from "@/lib/productContext";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ArtifactDetailClient } from "@/app/dashboard/artifacts/ArtifactDetailClient";

export default async function ArtifactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getDefaultEnvironmentIdForSelectedProduct();
  if (!ctx) redirect("/onboarding-v2");

  const supabase = createSupabaseServerClient();
  const { data: row } = await supabase
    .from("artifact_library_items")
    .select("id,artifact_type,title,status,created_at,content_json,source_run_id")
    .eq("environment_id", ctx.environmentId)
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  return (
    <ArtifactDetailClient
      environmentId={ctx.environmentId}
      artifact={{
        id: row.id as string,
        artifact_type: (row as any).artifact_type as string,
        title: (row as any).title as string,
        status: (row as any).status as "draft" | "ready",
        created_at: (row as any).created_at as string,
        content_json: (row as any).content_json,
        source_run_id: (row as any).source_run_id as string | null
      }}
    />
  );
}

