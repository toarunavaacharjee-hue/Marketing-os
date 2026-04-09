"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function OnboardingPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setLoading(true);
    setError(null);

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
      setError(bootstrapData?.error ?? "Could not create workspace.");
      return;
    }

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
      setError(t || "Could not set workspace context.");
      return;
    }

    // Auto-fill ICP + initial segment drafts from the product website URL (best-effort).
    // Even if it fails (e.g. missing Anthropic key), we still take the user to Product profile.
    try {
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
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-xs text-[#9090b0]">Company name</div>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
                placeholder="AI Marketing Workbench"
              />
            </div>

            <div>
              <div className="mb-1 text-xs text-[#9090b0]">Product name</div>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
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
                className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
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
              {loading ? "Creating..." : "Create workspace"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

