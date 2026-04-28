import { Suspense } from "react";
import LoginClient from "@/app/login/LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#08080c]">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-gradient-to-br from-[#7c6cff]/40 to-[#5a4fd4]/20" />
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}

