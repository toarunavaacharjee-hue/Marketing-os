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

    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) {
      setLoading(false);
      setError("You are not logged in.");
      return;
    }

    const { data: company, error: companyErr } = await supabase
      .from("companies")
      .insert({ name: companyName, created_by: user.id })
      .select("id")
      .single();

    if (companyErr || !company?.id) {
      setLoading(false);
      setError(companyErr?.message ?? "Could not create company.");
      return;
    }

    await supabase.from("company_members").insert({
      company_id: company.id,
      user_id: user.id,
      role: "owner"
    });

    const { data: product, error: productErr } = await supabase
      .from("products")
      .insert({
        company_id: company.id,
        name: productName,
        website_url: websiteUrl || null
      })
      .select("id")
      .single();

    if (productErr || !product?.id) {
      setLoading(false);
      setError(productErr?.message ?? "Could not create product.");
      return;
    }

    await supabase.from("product_environments").insert({
      product_id: product.id,
      name: "Default"
    });

    await fetch("/api/context/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ companyId: company.id, productId: product.id })
    });

    window.location.href = "/dashboard";
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

