"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSiteUrl } from "@/lib/siteUrl";

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

type ProductRow = {
  id: string;
  name: string | null;
};

type ProductMemberRow = {
  product_id: string;
  user_id: string;
  role: string;
};

export default function TeamSettingsClient({
  companyId,
  canAdmin,
  isOwner,
  initialCompanyName,
  initialMembers
}: {
  companyId: string;
  canAdmin: boolean;
  isOwner: boolean;
  initialCompanyName: string;
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

  const [workspaceName, setWorkspaceName] = useState(initialCompanyName);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState(false);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [productMembers, setProductMembers] = useState<ProductMemberRow[]>([]);
  const [productAccessUserId, setProductAccessUserId] = useState<string>("");
  const [productAccessBusy, setProductAccessBusy] = useState(false);

  async function refresh() {
    setError(null);
    setOk(null);
    const { data, error } = await supabase
      .from("company_members")
      .select("company_id,user_id,role")
      .eq("company_id", companyId)
      .order("role", { ascending: true });
    if (error) {
      setError(error.message);
      return;
    }

    const rows =
      (data ?? []).map((m: any) => ({
        company_id: m.company_id,
        user_id: m.user_id,
        role: m.role ?? "member"
      })) ?? [];

    const userIds = rows.map((r) => r.user_id).filter(Boolean);
    const { data: profileRows, error: pErr } = userIds.length
      ? await supabase.from("profiles").select("id,name").in("id", userIds)
      : { data: [], error: null as any };
    if (pErr) {
      setError(pErr.message);
      setMembers(rows.map((r) => ({ ...r, name: null })));
      return;
    }

    const byId = new Map<string, string | null>();
    (profileRows ?? []).forEach((p: any) => byId.set(String(p.id), (p.name ?? null) as string | null));
    setMembers(rows.map((r) => ({ ...r, name: byId.get(String(r.user_id)) ?? null })));
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

  async function loadProductsAndAccess() {
    setError(null);
    const { data: pRows, error: pErr } = await supabase
      .from("products")
      .select("id,name")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });
    if (pErr) {
      setError(pErr.message);
      return;
    }
    const nextProducts = (pRows ?? []) as ProductRow[];
    setProducts(nextProducts);

    if (!nextProducts.length) {
      setProductMembers([]);
      return;
    }
    const productIds = nextProducts.map((p) => p.id);
    const { data: pmRows, error: pmErr } = await supabase
      .from("product_members")
      .select("product_id,user_id,role")
      .in("product_id", productIds);
    if (pmErr) {
      setError(pmErr.message);
      return;
    }
    setProductMembers((pmRows ?? []) as ProductMemberRow[]);
  }

  useEffect(() => {
    void loadProductsAndAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function setUserProductAccess(userId: string, productId: string, allow: boolean) {
    if (!canAdmin) return;
    setProductAccessBusy(true);
    setError(null);
    setOk(null);
    try {
      if (allow) {
        const { error } = await supabase.from("product_members").insert({
          product_id: productId,
          user_id: userId,
          role: "member"
        });
        if (error) throw new Error(error.message);
        setProductMembers((prev) => {
          const exists = prev.some((r) => r.product_id === productId && r.user_id === userId);
          return exists ? prev : [...prev, { product_id: productId, user_id: userId, role: "member" }];
        });
      } else {
        const { error } = await supabase
          .from("product_members")
          .delete()
          .eq("product_id", productId)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
        setProductMembers((prev) => prev.filter((r) => !(r.product_id === productId && r.user_id === userId)));
      }
      setOk("Updated product access.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update product access.");
    } finally {
      setProductAccessBusy(false);
    }
  }

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

  async function saveWorkspaceName() {
    if (!canAdmin) return;
    const name = workspaceName.trim();
    if (!name) {
      setError("Workspace name is required.");
      return;
    }
    setSavingWorkspace(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/workspace/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company_id: companyId, name })
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to update workspace.");
      setOk("Workspace updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update workspace.");
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function deleteWorkspace() {
    if (!isOwner) return;
    const expected = initialCompanyName.trim();
    if (expected && deleteConfirm.trim() !== expected) {
      setError("Type the workspace name exactly to confirm deletion.");
      return;
    }
    setDeletingWorkspace(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/workspace/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ company_id: companyId, confirm_name: deleteConfirm.trim() })
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete workspace.");
      window.location.href = "/dashboard/settings";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete workspace.");
    } finally {
      setDeletingWorkspace(false);
    }
  }

  return (
    <div className="space-y-4">
      {!canAdmin ? (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
          You can view the team, but only <span className="text-heading">owners/admins</span> can change roles or
          remove members.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">{error}</div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-teal/30 bg-amber/10 px-3 py-2 text-sm text-teal">{ok}</div>
      ) : null}

      {canAdmin ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-sm text-heading">Product access</div>
          <div className="mt-2 text-sm text-text2">
            Assign which products within this workspace a user can access.
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <select
              value={productAccessUserId}
              onChange={(e) => setProductAccessUserId(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading disabled:opacity-60"
            >
              <option value="">Select a member…</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {(m.name ?? m.user_id.slice(0, 8) + "…") + " (" + m.role + ")"}
                </option>
              ))}
            </select>
            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadProductsAndAccess()}
                disabled={productAccessBusy}
                className="rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-heading hover:bg-surface2 disabled:opacity-60"
              >
                Refresh products
              </button>
              <div className="text-xs text-text2">{products.length ? `${products.length} products` : "No products yet"}</div>
            </div>
          </div>

          {productAccessUserId ? (
            <div className="mt-4 space-y-2">
              {products.map((p) => {
                const has = productMembers.some((pm) => pm.product_id === p.id && pm.user_id === productAccessUserId);
                return (
                  <label
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-black/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-heading">{p.name ?? "Untitled product"}</div>
                      <div className="truncate font-mono text-[11px] text-text2">{p.id}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={has}
                      disabled={productAccessBusy}
                      onChange={(e) => void setUserProductAccess(productAccessUserId, p.id, e.target.checked)}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                  </label>
                );
              })}
              {!products.length ? (
                <div className="text-sm text-text2">Create a product first, then come back to assign access.</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 text-sm text-text2">Pick a member to manage access.</div>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="text-sm text-heading">Workspace settings</div>
        <div className="mt-2 text-sm text-text2">Rename the workspace, or delete it (owner-only).</div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          <input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            disabled={!canAdmin || savingWorkspace || deletingWorkspace}
            className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text2 disabled:opacity-60"
            placeholder="Workspace name"
          />
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canAdmin || savingWorkspace || deletingWorkspace || !workspaceName.trim()}
              onClick={() => void saveWorkspaceName()}
              className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-heading hover:bg-surface2 disabled:opacity-60"
            >
              {savingWorkspace ? "Saving…" : "Save workspace"}
            </button>
          </div>
        </div>

        {isOwner ? (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="text-sm text-red-100">Danger zone</div>
            <div className="mt-1 text-sm text-red/80">
              Deleting a workspace removes all products and associated data. This cannot be undone.
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                disabled={deletingWorkspace || savingWorkspace}
                className="w-full rounded-xl border border-red-500/30 bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text2 disabled:opacity-60"
                placeholder={
                  initialCompanyName ? `Type "${initialCompanyName}" to confirm` : "Type workspace name to confirm"
                }
              />
              <div className="md:col-span-2">
                <button
                  type="button"
                  disabled={
                    deletingWorkspace ||
                    savingWorkspace ||
                    (Boolean(initialCompanyName.trim()) && deleteConfirm.trim() !== initialCompanyName.trim())
                  }
                  onClick={() => void deleteWorkspace()}
                  className="rounded-xl border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm text-red-100 hover:bg-red-500/25 disabled:opacity-60"
                >
                  {deletingWorkspace ? "Deleting…" : "Delete workspace"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="text-sm text-heading">Invites</div>
        <div className="mt-2 text-sm text-text2">
          Create a link invite. Email delivery can be added later; for now you can copy/paste the link.
        </div>

        {canAdmin ? (
          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading placeholder:text-text2"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
            <button
              type="button"
              disabled={inviteBusy}
              onClick={() => void createInvite()}
              className="rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
            >
              {inviteBusy ? "Creating…" : "Create invite"}
            </button>
          </div>
        ) : null}

        {lastInviteUrl ? (
          <div className="mt-3 rounded-xl border border-border bg-surface2 p-3">
            <div className="text-[10px] uppercase text-text2">Invite link</div>
            <div className="mt-1 break-all text-sm text-heading">{lastInviteUrl}</div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-border text-[10px] font-medium uppercase text-text2">
              <tr>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-heading">
              {invites.map((i) => {
                const status = i.revoked_at
                  ? "revoked"
                  : i.accepted_at
                    ? "accepted"
                    : new Date(i.expires_at).getTime() < Date.now()
                      ? "expired"
                      : "pending";
                const link = `${getSiteUrl()}/invite/${i.token}`;
                return (
                  <tr key={i.id} className="border-b border-border last:border-b-0">
                    <td className="py-3 pr-4">{i.email}</td>
                    <td className="py-3 pr-4 text-text2">{i.role}</td>
                    <td className="py-3 pr-4 text-text2">{status}</td>
                    <td className="py-3 pr-4 text-text2">{new Date(i.created_at).toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {!i.revoked_at && !i.accepted_at ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard.writeText(link)}
                              className="rounded-lg border border-border bg-surface2 px-2 py-1 text-xs text-heading hover:bg-surface2"
                            >
                              Copy link
                            </button>
                            {canAdmin ? (
                              <button
                                type="button"
                                disabled={inviteBusy}
                                onClick={() => void revokeInvite(i.id)}
                                className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red disabled:opacity-60"
                              >
                                Revoke
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs text-text3">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!invites.length ? (
                <tr>
                  <td className="py-3 text-sm text-text2" colSpan={5}>
                    No invites yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-heading">Members</div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-heading hover:bg-surface2"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-border text-[10px] font-medium uppercase text-text2">
              <tr>
                <th className="py-3 pr-4">Member</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-heading">
              {members.map((m) => {
                const busy = busyId === m.user_id;
                return (
                  <tr key={m.user_id} className="border-b border-border last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="text-sm">{m.name ?? m.user_id.slice(0, 8) + "…"}</div>
                      <div className="text-xs text-text2">{m.user_id}</div>
                    </td>
                    <td className="py-3 pr-4">
                      {canAdmin ? (
                        <select
                          value={m.role}
                          onChange={(e) => void setRole(m.user_id, e.target.value)}
                          disabled={busy}
                          className="rounded-lg border border-border bg-surface2 px-2 py-1 text-sm text-heading disabled:opacity-60"
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-text2">{m.role}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {canAdmin ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeMember(m.user_id)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red disabled:opacity-60"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-text3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-text2">
          Next: we can add invitations (by email) + approvals (review required / approved by reviewer) on content assets.
        </div>
      </div>
    </div>
  );
}

