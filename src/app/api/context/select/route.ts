import { NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    companyId?: string | null;
    productId?: string | null;
  };

  const res = NextResponse.json({ ok: true });

  if ("companyId" in body) {
    if (body.companyId) {
      res.cookies.set(TENANT_COOKIE.companyId, body.companyId, {
        path: "/",
        sameSite: "lax"
      });
    } else {
      res.cookies.set(TENANT_COOKIE.companyId, "", {
        path: "/",
        sameSite: "lax",
        expires: new Date(0)
      });
    }
  }

  if ("productId" in body) {
    if (body.productId) {
      res.cookies.set(TENANT_COOKIE.productId, body.productId, {
        path: "/",
        sameSite: "lax"
      });
    } else {
      res.cookies.set(TENANT_COOKIE.productId, "", {
        path: "/",
        sameSite: "lax",
        expires: new Date(0)
      });
    }
  }

  return res;
}

