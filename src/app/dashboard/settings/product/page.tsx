import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProductProfileClient from "@/app/dashboard/settings/product/ProductProfileClient";

export default async function ProductProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <div className="text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
          Product profile
        </div>
        <div className="mt-2 text-sm text-text2">
          Set your base product and competitors so Market Research can scan and compare automatically.
        </div>
      </div>

      <ProductProfileClient />
    </div>
  );
}

