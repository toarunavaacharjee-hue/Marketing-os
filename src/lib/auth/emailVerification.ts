import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export const VERIFY_EMAIL_PATH = "/verify-email";

/**
 * If the user signed up with email/password, Supabase may leave `email_confirmed_at` null
 * until they click the confirmation link. OAuth users typically have this set immediately.
 */
export function redirectIfUnverifiedEmail(user: User) {
  if (user.email && !user.email_confirmed_at) {
    const q = new URLSearchParams();
    q.set("email", user.email);
    redirect(`${VERIFY_EMAIL_PATH}?${q.toString()}`);
  }
}
