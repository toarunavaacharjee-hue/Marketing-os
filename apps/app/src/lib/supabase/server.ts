import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { CookieSerializeOptions } from "cookie";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieSerializeOptions;
};
// Helper type to satisfy strict TypeScript checks in build tooling.

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (options) cookieStore.set(name, value, options);
              else cookieStore.set(name, value);
            });
          } catch {
            // Server Components can't set cookies; middleware handles refresh.
          }
        }
      }
    }
  );
}

