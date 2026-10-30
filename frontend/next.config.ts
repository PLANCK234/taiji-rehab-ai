import type { NextConfig } from "next";

const apiBase = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiBase}/api/v1/:path*` }];
  },
};
export default nextConfig;
