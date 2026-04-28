/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next 14: externalize native/binary parsers for App Router routes + Route Handlers (avoids bundling pdf-parse etc.).
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "xlsx"]
  }
};

export default nextConfig;
