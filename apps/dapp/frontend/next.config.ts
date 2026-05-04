import type { NextConfig } from "next";

// Environment variable validation during build
if (!process.env.NEXT_PUBLIC_STELLAR_NETWORK && process.env.NODE_ENV !== "development") {
  console.warn("⚠️ Warning: NEXT_PUBLIC_STELLAR_NETWORK is not defined in environment variables");
}

const stellarRpcHosts = [
  "https://soroban-rpc.mainnet.stellar.org",
  "https://soroban-testnet.stellar.org",
  "https://horizon.stellar.org",
  "https://horizon-testnet.stellar.org",
];

const apiHosts = [
  "https://api.nester.finance",
  process.env.NODE_ENV === "development" ? "http://localhost:8080" : "",
].filter(Boolean);

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  `connect-src 'self' ${[...stellarRpcHosts, ...apiHosts].join(" ")} wss://api.nester.finance`,
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
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
