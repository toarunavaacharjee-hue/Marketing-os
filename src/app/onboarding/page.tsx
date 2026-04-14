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

    try {
      const bootstrapRes = await fetch("/api/onboarding/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName, productName, websiteUrl })
      });
      const bootstrapData = (await bootstrapRes.json().catch(() => null)) as
        | {
            ok?: boolean;
            companyId?: string;
            productId?: string;
            subscription_created?: boolean;
            step?: string;
            error?: string;
          }
        | null;
      if (!bootstrapRes.ok || !bootstrapData?.companyId || !bootstrapData?.productId) {
        setError(
          bootstrapData?.step
            ? `${bootstrapData.step}: ${bootstrapData.error ?? "Could not create workspace."}`
            : bootstrapData?.error ?? "Could not create workspace."
        );
        setStatus("");
        setLoading(false);
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
        setError(t || "Could not set workspace context.");
        setStatus("");
        setLoading(false);
        return;
      }

      // Auto-fill ICP + initial segment drafts from the product website URL (best-effort).
      // Important: Never block onboarding on this request. Time out quickly and continue.
      if (websiteUrl.trim()) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 12_000);
        try {
          setStatus("Generating your first drafts from your website (optional)…");
          const autoRes = await fetch("/api/product/profile/generate-from-website", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({}),
            signal: controller.signal
          });
          if (!autoRes.ok) {
            const data = (await autoRes.json().catch(() => null)) as { error?: string } | null;
            const msg = data?.error ?? (await autoRes.text());
            window.localStorage.setItem("marketing_os_autofill_error", msg || "Auto-fill failed.");
          }
        } catch (e) {
          const msg =
            e instanceof DOMException && e.name === "AbortError"
              ? "Auto-fill timed out."
              : e instanceof Error
                ? e.message
                : "Auto-fill failed.";
          window.localStorage.setItem("marketing_os_autofill_error", msg);
        } finally {
          window.clearTimeout(timeout);
        }
      }

      setStatus("Opening your workspace…");
      window.location.href = "/dashboard/settings/product";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-page text-text">
      <div className="mx-auto max-w-xl px-4 py-12 md:py-16">
        <div
          className="mb-2 text-4xl text-heading"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Set up your workspace
        </div>
        <div className="mb-6 text-sm text-text2">
          Create a workspace, then create your first product. Each product gets its own Default environment.
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <div className={`space-y-4 ${loading ? "opacity-40" : ""}`} aria-busy={loading}>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Workspace name</div>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={loading}
                className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus disabled:cursor-not-allowed"
                placeholder="e.g. Empowered Margins"
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Product name</div>
              <input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={loading}
                className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus disabled:cursor-not-allowed"
                placeholder="e.g. DataHub.Insure"
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Product website (optional)</div>
              <input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={loading}
                className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus disabled:cursor-not-allowed"
                placeholder="https://"
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading || !companyName || !productName}
              onClick={create}
              className="w-full rounded-sm bg-[var(--btn-neutral-bg)] px-4 py-3 text-sm font-semibold text-on-dark transition-[background-color,box-shadow,transform] duration-200 ease-aimw-out hover:bg-[var(--btn-neutral-hover)] active:scale-[0.99] disabled:opacity-60 motion-reduce:active:scale-100"
            >
              {loading ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-dropdown">
            <div className="mx-auto flex w-fit items-center justify-center">
              <div className="relative">
                <BrandMark />
              </div>
            </div>

            <div className="mt-5 text-sm font-semibold text-heading">Creating your workspace</div>
            <div className="mt-2 text-xs leading-relaxed text-text2">{status}</div>
            <div className="mt-4 text-[11px] text-text3">
              This can take a minute while we set up your product and drafts.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

