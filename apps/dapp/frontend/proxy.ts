import { NextResponse, type NextRequest } from "next/server";
import {
  STATIC_SECURITY_HEADERS,
  buildCsp,
  generateNonce,
} from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDev: process.env.NODE_ENV === "development",
    networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK,
    rpcUrl: process.env.NEXT_PUBLIC_STELLAR_RPC_URL,
    horizonUrl: process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    wsUrl: process.env.NEXT_PUBLIC_WS_URL,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
  });

  // Next reads the nonce from the request-side CSP header and applies it to
  // the framework's own inline scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  for (const [name, value] of Object.entries(STATIC_SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.webmanifest|sw.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
