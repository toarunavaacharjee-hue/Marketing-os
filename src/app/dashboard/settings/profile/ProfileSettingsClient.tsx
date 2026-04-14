"use client";

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ProfileSettingsClient({
  initialName,
  initialDisplayName,
  initialCompany,
  initialJobTitle,
  initialPhone,
  initialTimezone,
  initialLocale,
  initialAvatarUrl,
  email
}: {
  initialName: string;
  initialDisplayName: string;
  initialCompany: string;
  initialJobTitle: string;
  initialPhone: string;
  initialTimezone: string;
  initialLocale: string;
  initialAvatarUrl: string;
  email: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [name, setName] = useState(initialName);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [company, setCompany] = useState(initialCompany);
  const [jobTitle, setJobTitle] = useState(initialJobTitle);
  const [phone, setPhone] = useState(initialPhone);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [locale, setLocale] = useState(initialLocale);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveProfile() {
    setSaving(true);
    setSaved(null);
    setError(null);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      setSaving(false);
      setError("You are not logged in.");
      return;
    }

    const { error: uErr } = await supabase
      .from("profiles")
      .update({
        name,
        display_name: displayName,
        company,
        job_title: jobTitle,
        phone,
        timezone,
        locale,
        avatar_url: avatarUrl
      })
      .eq("id", user.id);

    setSaving(false);
    if (uErr) setError(uErr.message);
    else setSaved("Saved.");
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-text">My profile</div>
          <div className="mt-1 text-sm text-text2">Signed in as {email}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Full name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="Your name"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Display name</div>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="What should we call you?"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Company</div>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="Company"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Job title</div>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="e.g. Growth Lead"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Phone</div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="Optional"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Timezone</div>
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="e.g. Asia/Kolkata"
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Language / locale</div>
          <input
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="e.g. en-IN"
          />
        </div>
        <div className="md:col-span-2">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text3">Avatar URL</div>
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full rounded-sm border border-input-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text3 transition-[border-color,box-shadow] duration-200 ease-aimw-out focus:border-primary focus:outline-none focus:shadow-focus"
            placeholder="https://… (optional)"
          />
          <div className="mt-1 text-xs text-text3">Optional. Used for account menus and future team surfaces.</div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="mt-4 rounded-lg border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal">
          {saved}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void saveProfile()}
          disabled={saving}
          className="rounded-sm bg-[var(--btn-neutral-bg)] px-4 py-2.5 text-sm font-semibold text-on-dark transition-[background-color,box-shadow,transform] duration-200 ease-aimw-out hover:bg-[var(--btn-neutral-hover)] active:scale-[0.98] disabled:opacity-60 motion-reduce:active:scale-100"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

