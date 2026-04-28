import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Blocks deleting an auth user when they are the only `company_members` row with
 * role `owner` for a workspace (would orphan the company for ownership).
 */
export async function assertNotSoleCompanyOwner(
  admin: SupabaseClient,
  targetUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: ownerRows, error: ownerErr } = await admin
    .from("company_members")
    .select("company_id")
    .eq("user_id", targetUserId)
    .eq("role", "owner");

  if (ownerErr) {
    return { ok: false, error: ownerErr.message };
  }

  const companyIds = [
    ...new Set(
      (ownerRows ?? [])
        .map((r) => (r as { company_id?: string }).company_id)
        .filter((id): id is string => Boolean(id))
    )
  ];

  if (companyIds.length === 0) {
    return { ok: true };
  }

  const { data: allOwners, error: allErr } = await admin
    .from("company_members")
    .select("company_id")
    .in("company_id", companyIds)
    .eq("role", "owner");

  if (allErr) {
    return { ok: false, error: allErr.message };
  }

  const countByCompany = new Map<string, number>();
  for (const row of allOwners ?? []) {
    const cid = String((row as { company_id: string }).company_id);
    countByCompany.set(cid, (countByCompany.get(cid) ?? 0) + 1);
  }

  const blockedLabels: string[] = [];
  for (const cid of companyIds) {
    if ((countByCompany.get(cid) ?? 0) === 1) {
      const { data: comp } = await admin.from("companies").select("name").eq("id", cid).maybeSingle();
      const name = (comp as { name?: string | null } | null)?.name?.trim();
      blockedLabels.push(name ? `${name} (${cid})` : cid);
    }
  }

  if (blockedLabels.length === 0) {
    return { ok: true };
  }

  const suffix =
    blockedLabels.length === 1
      ? "this workspace"
      : `${blockedLabels.length} workspaces`;
  return {
    ok: false,
    error: `Cannot delete this user: sole owner of ${suffix}: ${blockedLabels.join(
      "; "
    )}. Transfer ownership in Team settings or add another owner before deleting.`
  };
}
