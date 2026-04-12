"use client";

import { useState } from "react";

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#7c6cff] to-[#5a4fd4] shadow-2xl shadow-[#7c6cff]/30 ring-1 ring-white/10 ${className}`}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22)_0%,transparent_55%)]" />
      <div className="relative text-sm font-bold tracking-tight text-white">AI</div>
    </div>
  );
}

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    setError(null);
    setStatus("Creating your workspace…");

    const bootstrapRes = await fetch("/api/onboarding/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyName, productName, websiteUrl })
    });
    const bootstrapData = (await bootstrapRes.json().catch(() => null)) as
      | { ok?: boolean; companyId?: string; productId?: string; error?: string }
      | null;
    if (!bootstrapRes.ok || !bootstrapData?.companyId || !bootstrapData?.productId) {
      setLoading(false);
      setStatus("");
      setError(bootstrapData?.error ?? "Could not create workspace.");
      return;
    }

    setStatus("Saving your workspace context…");
    const ctxRes = await fetch("/api/context/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: bootstrapData.companyId,
        productId: bootstrapData.productId
      })
    });
    if (!ctxRes.ok) {
      const t = await ctxRes.text();
      setLoading(false);
      setStatus("");
      setError(t || "Could not set workspace context.");
      return;
    }

    // Auto-fill ICP + initial segment drafts from the product website URL (best-effort).
    // Even if it fails (e.g. missing Anthropic key), we still take the user to Product profile.
    try {
      setStatus("Generating your first drafts from your website (optional)…");
      const autoRes = await fetch("/api/product/profile/generate-from-website", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({})
      });
      if (!autoRes.ok) {
        const data = (await autoRes.json().catch(() => null)) as { error?: string } | null;
        const msg = data?.error ?? (await autoRes.text());
        window.localStorage.setItem("marketing_os_autofill_error", msg || "Auto-fill failed.");
      }
    } catch {
      // Ignore — we'll still redirect.
    }

    setStatus("Opening your workspace…");
    window.location.href = "/dashboard/settings/product";
  }

  return (
    <div className="min-h-screen bg-[#08080c] text-[#f0f0f8]">
      <div className="mx-auto max-w-xl px-4 py-16">
        <div
          className="mb-2 text-4xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Set up your workspace
        </div>
        <div className="mb-6 text-sm text-[#9090b0]">
          Create a company, then create your first product. Each product gets its
          own Default environment.
        </div>

        <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
          <div className={`space-y-4 ${loading ? "opacity-40" : ""}`} aria-busy={loading}>
            <div>
              <div className="mb-1 text-xs text-[#9090b0]">Company name</div>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] disabled:cursor-not-allowed"
                placeholder="AI Marketing Workbench"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-[#9090b0]">Product name</div>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] disabled:cursor-not-allowed"
                placeholder="AI Marketing Workbench"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-[#9090b0]">
                Product website (optional)
              </div>
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8] disabled:cursor-not-allowed"
                placeholder="https://aimarketingworkbench.com"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading || !companyName || !productName}
              onClick={create}
              className="w-full rounded-xl bg-[#b8ff6c] px-4 py-3 text-sm font-medium text-black disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0c0c12]/90 p-6 text-center shadow-2xl">
            <div className="mx-auto flex w-fit items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-[28px] bg-[conic-gradient(from_180deg,rgba(124,108,255,0.0),rgba(124,108,255,0.85),rgba(184,255,108,0.55),rgba(124,108,255,0.0))] opacity-70 blur-md" />
                <div className="relative rounded-[26px] p-[2px]">
                  <div className="animate-spin rounded-[24px] bg-[conic-gradient(from_0deg,#7c6cff,#b8ff6c,#7c6cff)] p-[2px]">
                    <div className="rounded-[22px] bg-[#08080c] p-3">
                      <BrandMark className="animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 text-sm font-semibold text-[#f0f0f8]">Creating your workspace</div>
            <div className="mt-2 text-xs leading-relaxed text-[#9090b0]">{status}</div>
            <div className="mt-4 text-[11px] text-[#6c7088]">This can take a minute while we set up your product and drafts.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

