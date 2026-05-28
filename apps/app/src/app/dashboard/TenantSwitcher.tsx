"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type CompanyOption = { id: string; name: string };
export type ProductOption = { id: string; name: string; company_id: string; public_id?: string | null };
export type CompanyOptionWithPublicId = { id: string; name: string; public_id?: string | null };

export function TenantSwitcher({
  companies,
  products,
  selectedCompanyId,
  selectedProductId,
  theme = "dark"
}: {
  companies: CompanyOptionWithPublicId[];
  products: ProductOption[];
  selectedCompanyId: string | null;
  selectedProductId: string | null;
  theme?: "dark" | "light";
}) {
  const [loading, setLoading] = useState(false);
  const syncFixRef = useRef(false);

  const companyProducts = useMemo(() => {
    if (!selectedCompanyId) return [];
    return products.filter((p) => p.company_id === selectedCompanyId);
  }, [products, selectedCompanyId]);

  const selectedIsValid = useMemo(() => {
    if (!selectedProductId) return false;
    return companyProducts.some((p) => p.id === selectedProductId);
  }, [companyProducts, selectedProductId]);

  useEffect(() => {
    syncFixRef.current = false;
  }, [selectedCompanyId]);

  useEffect(() => {
    if (syncFixRef.current) return;
    if (!selectedCompanyId || companyProducts.length === 0) return;
    if (selectedIsValid) return;
    const first = companyProducts[0];
    if (!first) return;
    syncFixRef.current = true;
    void setContext(selectedCompanyId, first.id);
  }, [selectedCompanyId, companyProducts, selectedIsValid, selectedProductId]);

  async function setContext(nextCompanyId: string, nextProductId: string | null) {
    setLoading(true);
    await fetch("/api/context/select", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyId: nextCompanyId,
        productId: nextProductId ?? undefined
      })
    });
    window.location.href = "/dashboard";
  }

  const isLight = theme === "light";
  const labelCls = isLight
    ? "mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400"
    : "mb-2 text-xs font-semibold uppercase tracking-wider text-text3";
  const selectCls = isLight
    ? "w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 shadow-sm focus:border-primary focus:outline-none"
    : "w-full rounded-sm border border-transparent bg-sidebar-active px-3 py-2 text-sm text-on-dark shadow-none focus:border-primary focus:outline-none focus:shadow-focus";
  const linkCls = isLight
    ? "font-medium text-primary hover:underline"
    : "font-medium text-primary-light hover:underline";
  const helperCls = isLight ? "text-[11px] text-slate-400" : "text-xs text-on-dark/75";

  return (
    <div className={isLight ? "px-3 pb-3 pt-2" : "px-4 pb-3 pt-3"}>
      <div className={labelCls}>Workspace</div>
      <select
        value={selectedCompanyId ?? ""}
        disabled={loading || companies.length === 0}
        onChange={(e) => {
          const nextCompanyId = e.target.value;
          const firstProduct =
            products.find((p) => p.company_id === nextCompanyId) ?? null;
          setContext(nextCompanyId, firstProduct?.id ?? null);
        }}
        className={selectCls}
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.public_id ? ` · ${c.public_id}` : ""}
          </option>
        ))}
      </select>

      <div className={`${labelCls} ${isLight ? "mt-2.5" : "mb-2 mt-3"}`}>Product</div>
      <select
        value={selectedIsValid ? (selectedProductId ?? "") : ""}
        disabled={loading || companyProducts.length === 0}
        onChange={(e) => setContext(selectedCompanyId ?? "", e.target.value)}
        className={selectCls}
      >
        {!selectedIsValid && companyProducts.length > 0 ? (
          <option value="" disabled>Select product…</option>
        ) : null}
        {companyProducts.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.public_id ? ` · ${p.public_id}` : ""}
          </option>
        ))}
      </select>

      <div className={`mt-2.5 flex flex-wrap gap-x-3 gap-y-1 ${helperCls}`}>
        <a className={linkCls} href="/dashboard/settings/product#add-product">+ Add product</a>
        <a className={linkCls} href="/onboarding">+ New company</a>
      </div>
    </div>
  );
}

