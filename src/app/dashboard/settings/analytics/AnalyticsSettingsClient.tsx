"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Settings = {
  ga4_property_id: string;
  linkedin_ad_account: string;
  meta_ad_account: string;
  currency: string;
  timezone: string;
};

const MODULE = "analytics";
const KEY = "connections";

export default function AnalyticsSettingsClient({
  environmentId
}: {
  environmentId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [form, setForm] = useState<Settings>({
    ga4_property_id: "",
    linkedin_ad_account: "",
    meta_ad_account: "",
    currency: "USD",
    timezone: "UTC"
  });

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("module_settings")
      .select("value_json")
      .eq("environment_id", environmentId)
      .eq("module", MODULE)
      .eq("key", KEY)
      .maybeSingle();

    if (error) setError(error.message);
    const value = (data?.value_json ?? null) as Partial<Settings> | null;
    if (value) setForm((prev) => ({ ...prev, ...value }));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environmentId]);

  async function save() {
    setSaving(true);
    setSaved(null);
    setError(null);
    const { error } = await supabase.from("module_settings").upsert({
      environment_id: environmentId,
      module: MODULE,
      key: KEY,
      value_json: form
    });
    setSaving(false);
    if (error) setError(error.message);
    else setSaved("Saved.");
  }

  return (
    <div className="rounded-2xl border border-[#2a2e3f] bg-[#141420] p-6">
      <div className="text-lg text-[#f0f0f8]">Analytics connections</div>
      <div className="mt-1 text-sm text-[#9090b0]">
        Connect real GA4 data for this selected product.
      </div>
      <div className="mt-2 rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-xs text-[#9090b0]">
        Required for GA4: set `GA4_SERVICE_ACCOUNT_EMAIL` and `GA4_SERVICE_ACCOUNT_PRIVATE_KEY` in your environment,
        share GA4 property access with that service account in Google Analytics, then save the Property ID here.
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-[#9090b0]">Loading…</div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="mt-4 rounded-xl border border-[#b8ff6c]/30 bg-[#b8ff6c]/10 px-3 py-2 text-sm text-[#b8ff6c]">
          {saved}
        </div>
      ) : null}

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field
          label="GA4 property ID (Required for GA)"
          value={form.ga4_property_id}
          onChange={(v) => setForm({ ...form, ga4_property_id: v })}
          placeholder="123456789"
        />
        <Field
          label="LinkedIn ad account"
          value={form.linkedin_ad_account}
          onChange={(v) => setForm({ ...form, linkedin_ad_account: v })}
          placeholder="urn:li:sponsoredAccount:..."
        />
        <Field
          label="Meta ad account"
          value={form.meta_ad_account}
          onChange={(v) => setForm({ ...form, meta_ad_account: v })}
          placeholder="act_1234567890"
        />
        <Field
          label="Currency"
          value={form.currency}
          onChange={(v) => setForm({ ...form, currency: v })}
          placeholder="USD"
        />
        <Field
          label="Timezone"
          value={form.timezone}
          onChange={(v) => setForm({ ...form, timezone: v })}
          placeholder="UTC"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-5 rounded-xl bg-[#b8ff6c] px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save analytics settings"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs text-[#9090b0]">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#2a2e3f] bg-black/20 px-3 py-2 text-sm text-[#f0f0f8]"
      />
    </div>
  );
}

