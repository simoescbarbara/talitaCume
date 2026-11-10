import type { NextConfig } from "next";

// Where the Kotlin API runs. Server components call it directly; the browser calls
// same-origin /api/* and Next proxies it, so the backend needs no CORS configuration.
const apiUrl = process.env.API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
