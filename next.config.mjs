/** @type {import('next').NextConfig} */
const nextConfig = {
  // puppeteer/chromium are heavy; keep them external so Next doesn't try to bundle them
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  },
};

export default nextConfig;
