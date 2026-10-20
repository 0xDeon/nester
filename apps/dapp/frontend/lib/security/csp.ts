import { NETWORKS, type NetworkConfig } from "@/lib/networks";

const MAINNET_PASSPHRASE_MARKER = "Public Global";
const COINGECKO_ORIGIN = "https://api.coingecko.com";

export interface CspOptions {
  nonce: string;
  isDev: boolean;
  /** Stellar network passphrase (NEXT_PUBLIC_STELLAR_NETWORK). */
  networkPassphrase?: string;
  rpcUrl?: string;
  horizonUrl?: string;
  apiUrl?: string;
  wsUrl?: string;
  sentryDsn?: string;
}

export function resolveNetwork(networkPassphrase?: string): NetworkConfig {
  return networkPassphrase?.includes(MAINNET_PASSPHRASE_MARKER)
    ? NETWORKS.mainnet
    : NETWORKS.testnet;
}

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin === "null" ? null : url.origin;
  } catch {
    return null;
  }
}

/**
 * connect-src for the active network only. A mainnet build must not be able to
 * reach testnet hosts (and the reverse), so the hosts come from the build's
 * network rather than the union of both.
 */
export function buildConnectSrc(options: CspOptions): string[] {
  const network = resolveNetwork(options.networkPassphrase);
  const sources = new Set<string>(["'self'"]);

  const candidates = [
    options.rpcUrl || network.rpcUrl,
    options.horizonUrl || network.horizonUrl,
    options.apiUrl,
    options.wsUrl,
    COINGECKO_ORIGIN,
    network.friendbotUrl,
    options.sentryDsn,
  ];
  for (const candidate of candidates) {
    const origin = originOf(candidate);
    if (origin) sources.add(origin);
  }

  if (options.isDev) {
    sources.add("ws://localhost:*");
    sources.add("http://localhost:*");
  }
  return [...sources];
}

export function buildCsp(options: CspOptions): string {
  const { nonce, isDev } = options;
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["script-src", scriptSrc],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", buildConnectSrc(options)],
    ["worker-src", ["'self'"]],
    ["manifest-src", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
  ];

  const policy = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!isDev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
};

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
