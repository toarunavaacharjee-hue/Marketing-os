"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Member = {
  company_id: string;
  user_id: string;
  role: string;
  name: string | null;
};

const ROLE_OPTIONS = ["owner", "admin", "member"] as const;

export default function TeamSettingsClient({
  companyId,
  canAdmin,
  initialMembers
}: {
  companyId: string;
  canAdmin: boolean;
  initialMembers: Member[];
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    setOk(null);
    const { data, error } = await supabase
      .from("company_members")
      .select("company_id,user_id,role,profiles(name)")
      .eq("company_id", companyId)
      .order("role", { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }
    const next =
      (data ?? []).map((m: any) => ({
        company_id: m.company_id,
        user_id: m.user_id,
        role: m.role ?? "member",
        name: m.profiles?.name ?? null
      })) ?? [];
    setMembers(next);
  }

  async function setRole(userId: string, role: string) {
    if (!canAdmin) return;
    setBusyId(userId);
    setError(null);
    setOk(null);
    try {
      const { error } = await supabase
        .from("company_members")
        .update({ role })
        .eq("company_id", companyId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      setOk("Updated role.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeMember(userId: string) {
    if (!canAdmin) return;
    setBusyId(userId);
    setError(null);
    setOk(null);
    try {
      const { error } = await supabase
        .from("company_members")
        .delete()
        .eq("company_id", companyId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      setOk("Removed member.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {!canAdmin ? (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
          You can view the team, but only <span className="text-[#f0f0f8]">owners/admins</span> can change roles or
          remove members.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-[#b8ff6c]/30 bg-[#b8ff6c]/10 px-3 py-2 text-sm text-[#b8ff6c]">{ok}</div>
      ) : null}

      <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[#f0f0f8]">Members</div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-xs text-[#f0f0f8] hover:bg-white/5"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-[#2a2e3f] text-[10px] font-medium uppercase text-[#9090b0]">
              <tr>
                <th className="py-3 pr-4">Member</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[#f0f0f8]">
              {members.map((m) => {
                const busy = busyId === m.user_id;
                return (
                  <tr key={m.user_id} className="border-b border-[#2a2e3f] last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="text-sm">{m.name ?? m.user_id.slice(0, 8) + "…"}</div>
                      <div className="text-xs text-[#9090b0]">{m.user_id}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {canAdmin ? (
                        <select
                          value={m.role}
                          onChange={(e) => void setRole(m.user_id, e.target.value)}
                          disabled={busy}
                          className="rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-sm text-[#f0f0f8] disabled:opacity-60"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[#9090b0]">{m.role}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {canAdmin ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeMember(m.user_id)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-[#5c6278]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-[#9090b0]">
          Next: we can add invitations (by email) + approvals (review required / approved by reviewer) on content assets.
        </div>
      </div>
    </div>
  );
}

