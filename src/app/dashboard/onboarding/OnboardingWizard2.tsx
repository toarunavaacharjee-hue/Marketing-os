import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type RoleChoice =
  | "owner"
  | "executive"
  | "manager"
  | "marketer"
  | "sales"
  | "consultant"
  | "freelancer"
  | "other";

type GoalChoice =
  | "research_icp"
  | "positioning_messaging"
  | "launch_campaigns"
  | "sales_enablement"
  | "analytics";

type StepId = "role" | "details" | "confirm" | "creating" | "done";

function normalizeUrl(u: string): string {
  const raw = (u ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function hostFromUrl(u: string): string {
  try {
    return new URL(normalizeUrl(u)).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function titleFromHost(host: string): string {
  if (!host) return "";
  const base = host.split(".")[0] ?? "";
  if (!base) return "";
  return base
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function OnboardingWizard() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [step, setStep] = useState<StepId>("role");

  const [role, setRole] = useState<RoleChoice | null>(null);
  const [goal, setGoal] = useState<GoalChoice | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

  const websiteHost = useMemo(() => hostFromUrl(websiteUrl), [websiteUrl]);

  useEffect(() => {
    const suggested = titleFromHost(websiteHost);
    if (!suggested) return;
    setCompanyName((prev) => (prev.trim() ? prev : suggested));
    setProductName((prev) => (prev.trim() ? prev : suggested));
  }, [websiteHost]);

  async function create({ skipAutofill }: { skipAutofill: boolean }) {
    setLoading(true);
    setError(null);
    setStatus("Preparing your workspace…");
    setStep("creating");

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setLoading(false);
      setError("You are not logged in.");
      setStep("details");
      return;
    }

    const companyNameTrimmed = companyName.trim();
    const productNameTrimmed = productName.trim();
    if (!companyNameTrimmed || !productNameTrimmed) {
      setLoading(false);
      setError("Workspace name and product name are required.");
      setStep("details");
      return;
    }

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({ name: companyNameTrimmed, created_by: user.id })
      .select("id")
      .single();
    if (companyErr || !company?.id) {
      setLoading(false);
      setError(companyErr?.message ?? "Could not create workspace.");
      setStep("details");
      return;
    }

    const { error: memberErr } = await supabase.from("company_members").insert({
      company_id: company.id,
      user_id: user.id,
      role: "owner"
    });
    if (memberErr) {
      setLoading(false);
      setError(memberErr.message ?? "Could not add you to the workspace.");
      setStep("details");
      return;
    }

    const { error: subErr } = await supabase.from("company_subscriptions").insert({
      company_id: company.id,
      plan: "starter",
      status: "active",
      seats_included: 1,
      seats_addon: 0,
      products_included: 1,
      products_addon: 0
    });
    if (subErr) {
      setLoading(false);
      setError(subErr.message ?? "Could not create subscription row.");
      setStep("details");
      return;
    }

    setStatus("Creating your first product…");
    const { data: product, error: productErr } = await supabase
      .from("products")
      .insert({
        company_id: company.id,
        name: productNameTrimmed,
        website_url: websiteUrl.trim() ? normalizeUrl(websiteUrl) : null
      })
      .select("id")
      .single();
    if (productErr || !product?.id) {
      setLoading(false);
      setError(productErr?.message ?? "Could not create product.");
      setStep("details");
      return;
    }

    setStatus("Setting up your environment…");
    const { data: env, error: envErr } = await supabase
      .from("product_environments")
      .insert({
        product_id: product.id,
        name: "Default"
      })
      .select("id")
      .single<{ id: string }>();
    if (envErr || !env?.id) {
      setLoading(false);
      setError(envErr?.message ?? "Could not create product environment.");
      setStep("details");
      return;
    }

    const { error: pmErr } = await supabase.from("product_members").insert({
      product_id: product.id,
      user_id: user.id,
      role: "owner"
    });
    if (pmErr) {
      setLoading(false);
      setError(pmErr.message ?? "Could not grant you access to the product.");
      setStep("details");
      return;
    }

    setStatus("Finalizing workspace context…");
    const ctxRes = await fetch("/api/context/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId: company.id, productId: product.id })
    });
    if (!ctxRes.ok) {
      const t = await ctxRes.text();
      setLoading(false);
      setError(t || "Could not set workspace context.");
      setStep("details");
      return;
    }

    try {
      await supabase.from("module_settings").upsert({
        environment_id: env.id,
        module: "work",
        key: "onboarding_prefs",
        value_json: {
          role,
          goal,
          website_host: websiteHost || null,
          updated_at: new Date().toISOString()
        }
      });
    } catch {
      // ignore
    }

    if (!skipAutofill && websiteUrl.trim()) {
      setStatus("Generating ICP segments & positioning from your website…");
      try {
        const autoRes = await fetch("/api/product/profile/generate-from-website", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ replaceSegments: true, replaceCompetitors: true })
        });
        if (!autoRes.ok) {
          const data = (await autoRes.json().catch(() => null)) as { error?: string } | null;
          const msg = data?.error ?? (await autoRes.text());
          window.localStorage.setItem("marketing_os_autofill_error", msg || "Auto-fill failed.");
        }
      } catch {
        // ignore
      }
    }

    setLoading(false);
    setStep("done");
    window.location.href = "/dashboard/getting-started";
  }

  const progressIdx =
    step === "role" ? 1 : step === "details" ? 2 : step === "confirm" ? 3 : step === "creating" ? 4 : 5;
  const canContinueRole = Boolean(role && goal);
  const canContinueDetails = Boolean(companyName.trim() && productName.trim());

  return (
    <div className="min-h-[70vh]">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-[#9090b0]">Onboarding</div>
            <div className="mt-2 text-4xl text-[#f0f0f8]" style={{ fontFamily: "var(--font-heading)" }}>
              Let’s get you to value fast
            </div>
            <div className="mt-2 text-sm text-[#9090b0]">A 5-minute setup to generate your first ICP + positioning draft.</div>
          </div>
          <div className="shrink-0 rounded-xl border border-[#2a2e3f] bg-[#141420] px-3 py-2 text-xs text-[#9090b0]">
            Step <span className="text-[#f0f0f8]">{progressIdx}</span> / 5
          </div>
        </div>

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-black/30">
          <div className="h-full rounded-full bg-[#7c6cff] transition-all" style={{ width: `${(progressIdx / 5) * 100}%` }} />
        </div>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          {step === "role" ? (
            <div className="space-y-5">
              <div>
                <div className="text-sm text-[#f0f0f8]">Which best describes your role?</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      ["owner", "Owner / Founder"],
                      ["executive", "Executive team"],
                      ["manager", "Marketing manager"],
                      ["marketer", "Marketing / Growth"],
                      ["sales", "Sales / RevOps"],
                      ["consultant", "Consultant"],
                      ["freelancer", "Freelancer"],
                      ["other", "Other"]
                    ] as Array<[RoleChoice, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRole(id)}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        role === id
                          ? "border-[#7c6cff] bg-[#7c6cff]/10 text-[#f0f0f8]"
                          : "border-[#2a2e3f] bg-black/10 text-[#9090b0] hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-[#f0f0f8]">What do you want to achieve first?</div>
                <div className="mt-2 grid gap-2">
                  {(
                    [
                      ["research_icp", "Research & ICP segmentation"],
                      ["positioning_messaging", "Positioning & messaging"],
                      ["launch_campaigns", "Launch campaigns"],
                      ["sales_enablement", "Sales enablement (battlecards, pitches)"],
                      ["analytics", "Analytics & reporting"]
                    ] as Array<[GoalChoice, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setGoal(id)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                        goal === id
                          ? "border-[#7c6cff] bg-[#7c6cff]/10 text-[#f0f0f8]"
                          : "border-[#2a2e3f] bg-black/10 text-[#9090b0] hover:bg-white/5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button type="button" className="text-sm text-[#9090b0] hover:text-[#f0f0f8]" onClick={() => setStep("details")}>
                  Skip for now →
                </button>
                <button
                  type="button"
                  disabled={!canContinueRole}
                  onClick={() => setStep("details")}
                  className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === "details" ? (
            <div className="space-y-4">
              <div className="text-sm text-[#f0f0f8]">Does this look right?</div>
              <div className="text-sm text-[#9090b0]">
                Add your workspace and product details. If you provide a website, we’ll auto-generate your first drafts.
              </div>

              <div>
                <div className="mb-1 text-xs text-[#9090b0]">Workspace name</div>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
                  placeholder="Your company / workspace"
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-[#9090b0]">Product name</div>
                <input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
                  placeholder="Your product"
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-[#9090b0]">Product website (recommended)</div>
                <input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
                  placeholder="https://yourcompany.com"
                />
                {websiteHost ? <div className="mt-1 text-xs text-[#707090]">Detected: {websiteHost}</div> : null}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button type="button" className="text-sm text-[#9090b0] hover:text-[#f0f0f8]" onClick={() => setStep("role")}>
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={!canContinueDetails}
                  onClick={() => setStep("confirm")}
                  className="rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-4">
              <div className="text-sm text-[#f0f0f8]">Confirm & create</div>
              <div className="rounded-xl border border-[#2a2e3f] bg-black/10 p-4 text-sm">
                <div className="text-[#9090b0]">Workspace</div>
                <div className="mt-1 text-[#f0f0f8]">{companyName.trim() || "—"}</div>
                <div className="mt-3 text-[#9090b0]">Product</div>
                <div className="mt-1 text-[#f0f0f8]">{productName.trim() || "—"}</div>
                <div className="mt-3 text-[#9090b0]">Website</div>
                <div className="mt-1 break-words text-[#f0f0f8]">{websiteUrl.trim() ? normalizeUrl(websiteUrl) : "—"}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep("details")}
                  className="rounded-xl border border-[#2a2e3f] bg-black/10 px-4 py-2 text-sm text-[#f0f0f8] hover:bg-white/5 disabled:opacity-60"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void create({ skipAutofill: true })}
                  className="rounded-xl border border-[#2a2e3f] bg-transparent px-4 py-2 text-sm text-[#9090b0] hover:bg-white/5 disabled:opacity-60"
                >
                  Create without auto-fill
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void create({ skipAutofill: false })}
                  className="ml-auto rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
                >
                  {websiteUrl.trim() ? "Create & generate drafts" : "Create workspace"}
                </button>
              </div>
            </div>
          ) : null}

          {step === "creating" ? (
            <div className="space-y-3">
              <div className="text-sm text-[#f0f0f8]">Setting things up…</div>
              <div className="text-sm text-[#9090b0]">{status || "Working…"}</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/30">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-[#7c6cff]" />
              </div>
              <div className="pt-1 text-xs text-[#707090]">
                You’ll land on <span className="text-[#f0f0f8]">Getting started</span> next.
              </div>
            </div>
          ) : null}

          {step === "done" ? (
            <div className="space-y-3">
              <div className="text-sm text-[#f0f0f8]">You’re ready.</div>
              <div className="text-sm text-[#9090b0]">Redirecting…</div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 text-xs text-[#707090]">
          You can always change workspace/product details later in <span className="text-[#f0f0f8]">Settings</span>.
        </div>
      </div>
    </div>
  );
}

