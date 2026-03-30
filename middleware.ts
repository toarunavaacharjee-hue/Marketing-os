import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";
import { getEntitlements, normalizePlan } from "@/lib/planEntitlements";

type CookieToSet = {
  name: string;
  value: string;
  options?: CookieSerializeOptions;
};

/** Reliable hostname on Vercel (x-forwarded-host) vs local dev. */
function getRequestHostname(request: NextRequest) {
  const xf = request.headers.get("x-forwarded-host");
  if (xf) {
    const first = xf.split(",")[0]?.trim() ?? "";
    return first.split(":")[0]?.toLowerCase() ?? "";
  }
  return request.nextUrl.hostname.toLowerCase();
}

function isAppHostname(hostname: string) {
  return hostname.startsWith("app.");
}

function isProtectedAppPath(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/operator" ||
    pathname.startsWith("/operator/")
  );
}

export async function middleware(request: NextRequest) {
  // Subdomain behavior:
  // - app.<domain> root should land inside the product.
  const hostname = getRequestHostname(request);
  const isAppHost = isAppHostname(hostname);
  const path = request.nextUrl.pathname;
  const rootHost = hostname.replace(/^www\./, "").replace(/^app\./, "");
  const appHost = `app.${rootHost}`;

  // 1) app.<domain> should always land in /dashboard
  if (isAppHost && path === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Ensure the product/auth/operator routes never live on the marketing domain.
  // If someone hits these paths on the root domain, bounce to app.<domain>.
  if (
    !isAppHost &&
    (path.startsWith("/dashboard") ||
      path.startsWith("/operator") ||
      path.startsWith("/login") ||
      path.startsWith("/signup") ||
      path.startsWith("/auth") ||
      path.startsWith("/invite"))
  ) {
    const url = request.nextUrl.clone();
    url.hostname = appHost;
    // keep pathname + query
    return NextResponse.redirect(url);
  }

  // 2) marketing routes should NOT be served from app.<domain>
  // If someone browses app.<domain>/<anything-not-dashboard>, send them to the marketing domain.
  if (
    isAppHost &&
    !path.startsWith("/dashboard") &&
    !path.startsWith("/auth") &&
    !path.startsWith("/login") &&
    !path.startsWith("/signup") &&
    !path.startsWith("/invite") &&
    !path.startsWith("/operator") &&
    !path.startsWith("/api")
  ) {
    const url = request.nextUrl.clone();
    url.hostname = rootHost;
    return NextResponse.redirect(url);
  }

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
  // Run on all paths so we can enforce host-based routing
  matcher: ["/:path*"]
};

