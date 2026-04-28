export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function requirePublicEnv(value: string | undefined, name: string): string {
  // IMPORTANT: NEXT_PUBLIC_* vars must be referenced directly so Next.js can inline them into the client bundle.
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  NEXT_PUBLIC_SITE_URL:
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  NEXT_PUBLIC_SUPABASE_URL: requirePublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL"
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requirePublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  ),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};

