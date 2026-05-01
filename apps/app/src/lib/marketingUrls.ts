/** Marketing site base for legal links from the product app (signup, settings, etc.). */
export function marketingSiteBase(): string {
  const raw = process.env.NEXT_PUBLIC_MARKETING_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://www.aimarketingworkbench.com";
}

export function legalTermsUrl(): string {
  const override = process.env.NEXT_PUBLIC_LEGAL_TERMS_URL?.trim();
  if (override) return override;
  return `${marketingSiteBase()}/terms`;
}

export function legalPrivacyUrl(): string {
  const override = process.env.NEXT_PUBLIC_LEGAL_PRIVACY_URL?.trim();
  if (override) return override;
  return `${marketingSiteBase()}/privacy`;
}
