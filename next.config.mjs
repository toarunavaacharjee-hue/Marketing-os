/** @type {import('next').NextConfig} */
const appHost = process.env.NEXT_PUBLIC_APP_HOST ?? "app.aimarketingworkbench.com";
const rootHost = process.env.NEXT_PUBLIC_ROOT_HOST ?? "aimarketingworkbench.com";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "xlsx"]
  },
  /**
   * Edge-level backup: some proxies/cache paths can make middleware host checks flaky.
   * App subdomain root must never serve the marketing homepage.
   */
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "host", value: appHost }],
        destination: "/dashboard",
        permanent: false
      },
      {
        source: "/pricing",
        has: [{ type: "host", value: appHost }],
        destination: `https://${rootHost}/pricing`,
        permanent: false
      }
    ];
  }
};

export default nextConfig;
