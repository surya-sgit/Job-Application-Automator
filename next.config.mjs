/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep external so Next doesn't try to bundle them
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium", "pdf-parse", "pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      "./node_modules/pdfjs-dist/**/*",
      "./node_modules/pdf-parse/**/*"
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
