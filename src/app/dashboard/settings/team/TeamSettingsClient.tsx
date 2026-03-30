"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Member = {
  company_id: string;
  user_id: string;
  role: string;
  name: string | null;
};

const ROLE_OPTIONS = ["owner", "admin", "member"] as const;

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

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

  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

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

  async function loadInvites() {
    setError(null);
    const res = await fetch(`/api/team/invites?company_id=${encodeURIComponent(companyId)}`);
    const data = (await res.json()) as { invites?: Invite[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Failed to load invites.");
      return;
    }
    setInvites((data.invites ?? []) as Invite[]);
  }

  useEffect(() => {
    void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function createInvite() {
    if (!canAdmin) return;
    setInviteBusy(true);
    setError(null);
    setOk(null);
    setLastInviteUrl(null);
    try {
      const email = inviteEmail.trim().toLowerCase();
      if (!email || !email.includes("@")) throw new Error("Enter a valid email.");
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company_id: companyId, email, role: inviteRole })
      });
      const data = (await res.json()) as { invite_url?: string; error?: string; code?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to create invite.");
      setOk("Invite created. Copy the link below.");
      setLastInviteUrl(data.invite_url ?? null);
      setInviteEmail("");
      await loadInvites();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create invite.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    if (!canAdmin) return;
    setInviteBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/team/invites?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to revoke invite.");
      setOk("Invite revoked.");
      await loadInvites();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke invite.");
    } finally {
      setInviteBusy(false);
    }
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
        <div className="text-sm text-[#f0f0f8]">Invites</div>
        <div className="mt-2 text-sm text-[#9090b0]">
          Create a link invite. Email delivery can be added later; for now you can copy/paste the link.
        </div>

        {canAdmin ? (
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] placeholder:text-[#9090b0]"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
            <button
              type="button"
              disabled={inviteBusy}
              onClick={() => void createInvite()}
              className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {inviteBusy ? "Creating…" : "Create invite"}
            </button>
          </div>
        ) : null}

        {lastInviteUrl ? (
          <div className="mt-3 rounded-xl border border-[#2a2e3f] bg-black/20 p-3">
            <div className="text-[10px] uppercase text-[#9090b0]">Invite link</div>
            <div className="mt-1 break-all text-sm text-[#f0f0f8]">{lastInviteUrl}</div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-[#2a2e3f] text-[10px] font-medium uppercase text-[#9090b0]">
              <tr>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[#f0f0f8]">
              {invites.map((i) => {
                const status = i.revoked_at
                  ? "revoked"
                  : i.accepted_at
                    ? "accepted"
                    : new Date(i.expires_at).getTime() < Date.now()
                      ? "expired"
                      : "pending";
                const link = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${i.token}`;
                return (
                  <tr key={i.id} className="border-b border-[#2a2e3f] last:border-b-0">
                    <td className="py-3 pr-4">{i.email}</td>
                    <td className="py-3 pr-4 text-[#9090b0]">{i.role}</td>
                    <td className="py-3 pr-4 text-[#9090b0]">{status}</td>
                    <td className="py-3 pr-4 text-[#9090b0]">{new Date(i.created_at).toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {!i.revoked_at && !i.accepted_at ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard.writeText(link)}
                              className="rounded-lg border border-[#2a2e3f] bg-black/20 px-2 py-1 text-xs text-[#f0f0f8] hover:bg-white/5"
                            >
                              Copy link
                            </button>
                            {canAdmin ? (
                              <button
                                type="button"
                                disabled={inviteBusy}
                                onClick={() => void revokeInvite(i.id)}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-200 disabled:opacity-60"
                              >
                                Revoke
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs text-[#5c6278]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!invites.length ? (
                <tr>
                  <td className="py-3 text-sm text-[#9090b0]" colSpan={5}>
                    No invites yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

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

