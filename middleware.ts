import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { CookieSerializeOptions } from "cookie";

function isDashboardPath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export async function middleware(request: NextRequest) {
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
          cookiesToSet: Array<{
            name: string;
            value: string;
            options: CookieSerializeOptions | undefined;
          }>
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

  if (isDashboardPath(request.nextUrl.pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"]
};

