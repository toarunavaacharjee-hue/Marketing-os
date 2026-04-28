import { google } from "googleapis";

function normalizePrivateKey(raw: string) {
  return raw.replace(/\\n/g, "\n").trim();
}

function requireGaEnv(name: "GA4_SERVICE_ACCOUNT_EMAIL" | "GA4_SERVICE_ACCOUNT_PRIVATE_KEY") {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

export function createGa4Client() {
  const clientEmail = requireGaEnv("GA4_SERVICE_ACCOUNT_EMAIL");
  const privateKey = normalizePrivateKey(requireGaEnv("GA4_SERVICE_ACCOUNT_PRIVATE_KEY"));

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"]
  });

  return google.analyticsdata({
    version: "v1beta",
    auth
  });
}

