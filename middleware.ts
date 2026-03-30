import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";
import { getEntitlements, normalizePlan } from "@/lib/planEntitlements";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieSerializeOptions;
};

function isProtectedAppPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/operator" ||
    pathname.startsWith("/operator/")
  );
}

export async function middleware(request: NextRequest) {
  // Avoid redirect loops: onboarding lives at /onboarding now.
  if (request.nextUrl.pathname === "/dashboard/onboarding") {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: CookieToSet[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (options) response.cookies.set(name, value, options);
            else response.cookies.set(name, value);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (isProtectedAppPath(request.nextUrl.pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Plan gating (hard): restrict Starter/Free from paid modules.
  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    const plan = normalizePlan((profileRow as { plan?: string | null } | null)?.plan ?? null);
    const ent = getEntitlements(plan);

    // /dashboard -> slug ""
    const path = request.nextUrl.pathname.replace(/^\/dashboard\/?/, "");
    const slug = path.split("/").filter(Boolean)[0] ?? "";

    if (!ent.allowedDashboardSlugs.has("*") && !ent.allowedDashboardSlugs.has(slug)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard/upgrade";
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/operator", "/operator/:path*"]
};

