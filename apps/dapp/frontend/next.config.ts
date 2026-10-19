import type { NextConfig } from "next";
import path from "path";
import { assertProductionBuildEnv } from "./lib/build-env";

// Fail production builds that would ship without a network or real contract IDs.
assertProductionBuildEnv(process.env);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // Monorepo root (where pnpm-lock.yaml lives) so Turbopack resolves the
    // workspace correctly under pnpm's hoisted node_modules.
    root: path.resolve(__dirname, "../../../"),
  },
  async rewrites() {
    const intelligenceUrl =
      process.env.INTELLIGENCE_SERVICE_URL ?? "http://localhost:8000";
    const apiUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
      : "http://localhost:8080";
    return [
      // Go backend — all /api/v1/* calls
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
      // Intelligence / AI service
      {
        source: "/api/intelligence/:path*",
        destination: `${intelligenceUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
