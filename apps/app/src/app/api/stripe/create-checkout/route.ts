import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Billing is disabled for now. The app is in free mode and this endpoint is not active."
    },
    { status: 501 }
  );
}

