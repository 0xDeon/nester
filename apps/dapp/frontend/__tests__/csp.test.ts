import { describe, it, expect } from "vitest";
import {
  STATIC_SECURITY_HEADERS,
  buildConnectSrc,
  buildCsp,
  generateNonce,
} from "@/lib/security/csp";

const TESTNET = "Test SDF Network ; September 2015";
const MAINNET = "Public Global Stellar Network ; September 2015";

function directive(csp: string, name: string): string[] {
  const found = csp.split("; ").find((part) => part.startsWith(`${name} `));
  return found ? found.slice(name.length + 1).split(" ") : [];
}

describe("buildCsp", () => {
  const base = { nonce: "abc123", isDev: false, networkPassphrase: TESTNET };

  it("locks down framing, plugins and base uri", () => {
    const csp = buildCsp(base);
    expect(directive(csp, "default-src")).toEqual(["'self'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
  });

  it("uses a nonce and never allows unsafe-inline scripts in production", () => {
    const scriptSrc = directive(buildCsp(base), "script-src");
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("only allows unsafe-eval in development", () => {
    expect(directive(buildCsp({ ...base, isDev: true }), "script-src")).toContain("'unsafe-eval'");
  });

  it("limits connect-src to the testnet hosts on a testnet build", () => {
    const connect = buildConnectSrc(base);
    expect(connect).toContain("https://soroban-testnet.stellar.org");
    expect(connect).toContain("https://horizon-testnet.stellar.org");
    expect(connect).not.toContain("https://soroban-rpc.mainnet.stellar.org");
    expect(connect).not.toContain("https://horizon.stellar.org");
  });

  it("limits connect-src to the mainnet hosts on a mainnet build", () => {
    const connect = buildConnectSrc({ ...base, networkPassphrase: MAINNET });
    expect(connect).toContain("https://soroban-rpc.mainnet.stellar.org");
    expect(connect).toContain("https://horizon.stellar.org");
    expect(connect).not.toContain("https://soroban-testnet.stellar.org");
    expect(connect).not.toContain("https://friendbot.stellar.org");
  });

  it("honors explicit RPC and Horizon overrides", () => {
    const connect = buildConnectSrc({
      ...base,
      rpcUrl: "https://rpc.example.org/path",
      horizonUrl: "https://horizon.example.org",
    });
    expect(connect).toContain("https://rpc.example.org");
    expect(connect).toContain("https://horizon.example.org");
    expect(connect).not.toContain("https://soroban-testnet.stellar.org");
  });

  it("adds the API, websocket and Sentry origins when configured", () => {
    const connect = buildConnectSrc({
      ...base,
      apiUrl: "https://api.nester.finance/api/v1",
      wsUrl: "wss://api.nester.finance/ws",
      sentryDsn: "https://key@o1.ingest.sentry.io/2",
    });
    expect(connect).toContain("https://api.nester.finance");
    expect(connect).toContain("wss://api.nester.finance");
    expect(connect).toContain("https://o1.ingest.sentry.io");
  });

  it("omits Sentry when no DSN is set", () => {
    expect(buildConnectSrc(base).join(" ")).not.toContain("sentry");
  });

  it("ignores malformed URLs", () => {
    expect(buildConnectSrc({ ...base, apiUrl: "not a url" })).not.toContain("not a url");
  });

  it("generates a distinct nonce per call", () => {
    expect(generateNonce()).not.toEqual(generateNonce());
  });

  it("defines the static hardening headers", () => {
    expect(Object.keys(STATIC_SECURITY_HEADERS)).toEqual(
      expect.arrayContaining([
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ])
    );
  });
});
