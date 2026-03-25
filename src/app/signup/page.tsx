import { Suspense } from "react";
import SignupClient from "@/app/signup/SignupClient";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08080c]" />}>
      <SignupClient />
    </Suspense>
  );
}

