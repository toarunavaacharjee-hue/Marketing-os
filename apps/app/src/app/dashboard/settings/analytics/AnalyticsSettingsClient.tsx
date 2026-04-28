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
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "err">("idle");
  const [testMsg, setTestMsg] = useState<string | null>(null);

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

  async function testGa() {
    setTesting(true);
    setTestStatus("idle");
    setTestMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/analytics/ga4/test", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "GA test failed.");
      setTestStatus("ok");
      setTestMsg("Connected. GA4 API access is working for this property.");
    } catch (e) {
      setTestStatus("err");
      setTestMsg(e instanceof Error ? e.message : "GA test failed.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="text-lg text-heading">Analytics connections</div>
      <div className="mt-1 text-sm text-text2">
        Connect real GA4 data for this selected product.
      </div>
      <div className="mt-2 rounded-xl border border-border bg-surface2 px-3 py-2 text-xs text-text2">
        Required for GA4: set `GA4_SERVICE_ACCOUNT_EMAIL` and `GA4_SERVICE_ACCOUNT_PRIVATE_KEY` in your environment,
        share GA4 property access with that service account in Google Analytics, then save the Property ID here.
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-text2">Loading…</div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="mt-4 rounded-xl border border-teal/30 bg-amber/10 px-3 py-2 text-sm text-teal">
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
        className="mt-5 rounded-xl bg-amber px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save analytics settings"}
      </button>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={testGa}
          disabled={testing}
          className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm font-medium text-heading transition hover:bg-surface2 disabled:opacity-60"
        >
          {testing ? "Testing..." : "Test GA connection"}
        </button>
        {testMsg ? (
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              testStatus === "ok"
                ? "border-teal/30 bg-amber/10 text-teal"
                : "border-red-500/30 bg-red-500/10 text-red"
            }`}
          >
            {testMsg}
          </div>
        ) : null}
      </div>
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
      <div className="mb-1 text-xs text-text2">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface2 px-3 py-2 text-sm text-heading"
      />
    </div>
  );
}

