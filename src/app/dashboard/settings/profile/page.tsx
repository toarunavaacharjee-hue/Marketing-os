import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProfileSettingsClient from "@/app/dashboard/settings/profile/ProfileSettingsClient";

export default async function ProfileSettingsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name,display_name,company,job_title,phone")
    .eq("id", user.id)
    .maybeSingle();

  const name = String((profile as any)?.name ?? "").trim();
  const displayName = String((profile as any)?.display_name ?? "").trim();
  const company = String((profile as any)?.company ?? "").trim();
  const jobTitle = String((profile as any)?.job_title ?? "").trim();
  const phone = String((profile as any)?.phone ?? "").trim();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-text2">
          <Link href="/dashboard" className="text-accent hover:underline">
            ← Command Centre
          </Link>
          <span className="text-text3">|</span>
          <Link href="/dashboard/settings" className="text-accent hover:underline">
            Workspace settings
          </Link>
        </div>
        <div className="mt-2 text-4xl text-heading" style={{ fontFamily: "var(--font-heading)" }}>
          My profile
        </div>
        <div className="mt-2 text-sm text-text2">
          Update your personal details used across the workspace.
        </div>
      </div>

      <ProfileSettingsClient
        initialName={name}
        initialDisplayName={displayName}
        initialCompany={company}
        initialJobTitle={jobTitle}
        initialPhone={phone}
        email={user.email ?? ""}
      />
    </div>
  );
}

