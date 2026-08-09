/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
};

export default nextConfig; 
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  },
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/playwright-core/**"],
  },
};

export default nextConfig;