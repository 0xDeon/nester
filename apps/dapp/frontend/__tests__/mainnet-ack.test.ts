import { describe, it, expect, beforeEach } from "vitest";
import { hasAcknowledgedMainnet, acknowledgeMainnet } from "@/lib/mainnet-ack";

describe("mainnet acknowledgement", () => {
  beforeEach(() => localStorage.clear());

  it("is not acknowledged by default", () => {
    expect(hasAcknowledgedMainnet("GWALLETA")).toBe(false);
  });

  it("persists the acknowledgement for that wallet", () => {
    acknowledgeMainnet("GWALLETA");
    expect(hasAcknowledgedMainnet("GWALLETA")).toBe(true);
  });

  it("does not carry over to a different wallet", () => {
    acknowledgeMainnet("GWALLETA");
    expect(hasAcknowledgedMainnet("GWALLETB")).toBe(false);
  });

  it("is not acknowledged without a wallet address", () => {
    acknowledgeMainnet("");
    expect(hasAcknowledgedMainnet("")).toBe(false);
  });
});
