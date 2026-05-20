"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Connector = {
  enabled: boolean;
  account_id: string;
  token: string;
  notes: string;
};

type IntegrationSettings = {
  ga4: Connector;
  hubspot: Connector;
  linkedin_ads: Connector;
  meta_ads: Connector;
};

const MODULE = "integrations";
const KEY = "connectors";

const defaultConnector: Connector = {
  enabled: false,
  account_id: "",
  token: "",
  notes: ""
};

const defaultSettings: IntegrationSettings = {
  ga4: { ...defaultConnector },
  hubspot: { ...defaultConnector },
  linkedin_ads: { ...defaultConnector },
  meta_ads: { ...defaultConnector }
};

export default function IntegrationsClient({
  environmentId
}: {
  environmentId: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

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

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const value = (data?.value_json ?? null) as Partial<IntegrationSettings> | null;
    if (value) {
      setSettings({
        ga4: { ...defaultConnector, ...(value.ga4 ?? {}) },
        hubspot: { ...defaultConnector, ...(value.hubspot ?? {}) },
        linkedin_ads: { ...defaultConnector, ...(value.linkedin_ads ?? {}) },
        meta_ads: { ...defaultConnector, ...(value.meta_ads ?? {}) }
      });
    }
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
      value_json: settings
    });
    setSaving(false);
    if (error) setError(error.message);
    else setSaved("Integration settings saved.");
  }

  function update<K extends keyof IntegrationSettings>(
    key: K,
    patch: Partial<IntegrationSettings[K]>
  ) {
    setSettings((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch }
    }));
  }

  return (
    <div className="space-y-4">
      {/* Security notice */}
      <div className="rounded-xl border border-amber/30 bg-amber/8 px-4 py-3 text-sm text-text2">
        <span className="font-semibold text-text">Security:</span> Tokens are stored in your
        workspace database, scoped to your authenticated session via Supabase RLS. Never
        commit tokens to source control — configure them only here.
      </div>

      {loading ? (
        <div className="saas-card p-6 text-sm text-text2">Loading…</div>
      ) : (
        <div className="saas-card p-6 space-y-6">
          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red">
              {error}
            </div>
          ) : null}
          {saved ? (
            <div className="rounded-xl border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal">
              {saved}
            </div>
          ) : null}

          {/* GA4 */}
          <IntegrationBlock
            title="Google Analytics 4"
            badge="GA4"
            badgeColor="bg-[#E37400]/10 text-[#E37400]"
            enabled={settings.ga4.enabled}
            onToggle={(v) => update("ga4", { enabled: v })}
            steps={[
              "Google Analytics → Admin → Property → Service Accounts",
              "Grant the service account Viewer role on your GA4 property",
              "Set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_GA4_PROPERTY_ID as Vercel env vars — not stored here"
            ]}
            docsHref="https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart-client-libraries"
          >
            <Field
              label="GA4 Property ID"
              hint="Numeric ID — Admin → Property Settings (e.g. 123456789)"
              value={settings.ga4.account_id}
              onChange={(v) => update("ga4", { account_id: v })}
              placeholder="123456789"
            />
            <Field
              label="Notes"
              value={settings.ga4.notes}
              onChange={(v) => update("ga4", { notes: v })}
              placeholder="e.g. Production property"
            />
          </IntegrationBlock>

          {/* HubSpot */}
          <IntegrationBlock
            title="HubSpot CRM"
            badge="CRM"
            badgeColor="bg-[#FF7A59]/10 text-[#FF7A59]"
            enabled={settings.hubspot.enabled}
            onToggle={(v) => update("hubspot", { enabled: v })}
            steps={[
              "HubSpot → Settings → Integrations → Private Apps → Create a private app",
              "Required scopes: crm.objects.contacts.read, crm.objects.deals.read",
              "Copy the Private App Token (starts with pat-na1-…) and paste below"
            ]}
            docsHref="https://developers.hubspot.com/docs/api/private-apps"
          >
            <Field
              label="Private App Token"
              hint="Starts with pat-na1-… — treat this like a password"
              value={settings.hubspot.token}
              onChange={(v) => update("hubspot", { token: v })}
              placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              secret
            />
            <Field
              label="Notes"
              value={settings.hubspot.notes}
              onChange={(v) => update("hubspot", { notes: v })}
              placeholder="e.g. Prod portal, Sales pipeline"
            />
          </IntegrationBlock>

          {/* LinkedIn Ads */}
          <IntegrationBlock
            title="LinkedIn Ads"
            badge="Ads"
            badgeColor="bg-[#0A66C2]/10 text-[#0A66C2]"
            enabled={settings.linkedin_ads.enabled}
            onToggle={(v) => update("linkedin_ads", { enabled: v })}
            steps={[
              "developer.linkedin.com → My Apps → Create app",
              "Add Marketing Developer Platform product and request access",
              "OAuth 2.0 scopes needed: r_ads_reporting, r_ads",
              "Use the Token Generator tool to create a long-lived access token"
            ]}
            docsHref="https://learn.microsoft.com/en-us/linkedin/marketing/getting-started"
          >
            <Field
              label="Ad Account ID"
              hint="Numeric ID from Campaign Manager URL (…/campaignmanager/accounts/{id})"
              value={settings.linkedin_ads.account_id}
              onChange={(v) => update("linkedin_ads", { account_id: v })}
              placeholder="508XXXXXX"
            />
            <Field
              label="Access Token"
              hint="OAuth 2.0 bearer token — expires in ~60 days, rotate regularly"
              value={settings.linkedin_ads.token}
              onChange={(v) => update("linkedin_ads", { token: v })}
              placeholder="AQX..."
              secret
            />
          </IntegrationBlock>

          {/* Meta Ads */}
          <IntegrationBlock
            title="Meta Ads (Facebook / Instagram)"
            badge="Ads"
            badgeColor="bg-[#1877F2]/10 text-[#1877F2]"
            enabled={settings.meta_ads.enabled}
            onToggle={(v) => update("meta_ads", { enabled: v })}
            steps={[
              "developers.facebook.com → My Apps → Create app → Business type",
              "Add Marketing API product to your app",
              "Create a System User in Business Manager and assign it Ad Account access",
              "Generate a System User Access Token — these don't expire unlike user tokens"
            ]}
            docsHref="https://developers.facebook.com/docs/marketing-api/get-started"
          >
            <Field
              label="Ad Account ID"
              hint="Format: act_XXXXXXXXXX — found in Ads Manager URL"
              value={settings.meta_ads.account_id}
              onChange={(v) => update("meta_ads", { account_id: v })}
              placeholder="act_1234567890"
            />
            <Field
              label="Access Token"
              hint="Use a System User token for production — never use short-lived user tokens"
              value={settings.meta_ads.token}
              onChange={(v) => update("meta_ads", { token: v })}
              placeholder="EAAxxxxxxxxx..."
              secret
            />
          </IntegrationBlock>

          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save integrations"}
          </button>
        </div>
      )}
    </div>
  );
}

function IntegrationBlock({
  title,
  badge,
  badgeColor,
  enabled,
  onToggle,
  steps,
  docsHref,
  children
}: {
  title: string;
  badge: string;
  badgeColor: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  steps: string[];
  docsHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="hs-card2 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${badgeColor}`}>
            {badge}
          </span>
          <span className="text-sm font-semibold text-heading">{title}</span>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text2 select-none">
          <div
            onClick={() => onToggle(!enabled)}
            className={`relative h-5 w-9 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </div>
          {enabled ? "Enabled" : "Disabled"}
        </label>
      </div>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
          <span className="transition group-open:rotate-90">›</span>
          How to get credentials
          <a
            href={docsHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto font-normal text-text3 underline-offset-2 hover:underline"
          >
            Official docs ↗
          </a>
        </summary>
        <ol className="mt-2 space-y-1.5 pl-4">
          {steps.map((s, i) => (
            <li key={i} className="text-[12px] leading-relaxed text-text2">
              <span className="mr-1.5 font-semibold text-text3">{i + 1}.</span>
              {s}
            </li>
          ))}
        </ol>
      </details>

      {enabled ? (
        <div className="grid gap-3 md:grid-cols-2">
          {children}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-text3">
          Enable this integration to enter credentials.
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  secret = false
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-text2">{label}</label>
      <div className="relative">
        <input
          type={secret && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full hs-card px-3 py-2 pr-16 text-sm text-heading placeholder:text-text3 focus:border-primary focus:outline-none"
        />
        {secret ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 text-[10px] font-medium text-text3 hover:text-text"
          >
            {show ? "hide" : "show"}
          </button>
        ) : null}
      </div>
      {hint ? <div className="text-[11px] leading-relaxed text-text3">{hint}</div> : null}
    </div>
  );
}
