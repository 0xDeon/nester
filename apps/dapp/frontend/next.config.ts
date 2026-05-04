import type { NextConfig } from "next";

// Environment variable validation during build
if (!process.env.NEXT_PUBLIC_STELLAR_NETWORK && process.env.NODE_ENV !== "development") {
  console.warn("⚠️ Warning: NEXT_PUBLIC_STELLAR_NETWORK is not defined in environment variables");
}

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            // In production use a strict policy; in development keep it open
            // so hot-reload WebSockets and inline scripts work.
            value: isProd
              ? [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline'", // Next.js requires unsafe-inline for its runtime
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob: https:",
                  "font-src 'self'",
                  "connect-src 'self' https://*.stellar.org https://*.nester.fi wss://*.nester.fi",
                  "frame-ancestors 'none'",
                  "base-uri 'self'",
                  "form-action 'self'",
                ].join("; ")
              : "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss: http: https:",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },

  async rewrites() {
    // Only the intelligence service is proxied through Next.js — the Go API
    // is accessed directly via NEXT_PUBLIC_API_URL from the client.
    const intelligenceUrl =
      process.env.INTELLIGENCE_SERVICE_URL ?? "http://localhost:8000";
    return [
      {
        source: "/intelligence/:path*",
        destination: `${intelligenceUrl}/intelligence/:path*`,
      },
    ];
  },
};

export default nextConfig;
