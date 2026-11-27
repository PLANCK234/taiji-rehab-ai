import type { NextConfig } from "next";

const apiBase = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return ["/participants/:id/pose-lab", "/patient"].map((source) => ({
      source,
      headers: [{
        key: "Content-Security-Policy",
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
      }],
    }));
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiBase}/api/v1/:path*` }];
  },
};
export default nextConfig;
