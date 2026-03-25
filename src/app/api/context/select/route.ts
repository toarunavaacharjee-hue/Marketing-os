import { NextResponse } from "next/server";
import { TENANT_COOKIE } from "@/lib/tenant";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    companyId?: string;
    productId?: string;
  };

  const res = NextResponse.json({ ok: true });

  if (body.companyId) {
    res.cookies.set(TENANT_COOKIE.companyId, body.companyId, {
      path: "/",
      sameSite: "lax"
    });
  }
  if (body.productId) {
    res.cookies.set(TENANT_COOKIE.productId, body.productId, {
      path: "/",
      sameSite: "lax"
    });
  }

  return res;
}

