import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_SLIPPAGE_BPS,
  MAX_SLIPPAGE_BPS,
  QUOTE_MAX_AGE_MS,
  applySlippage,
  applySlippageToAmount,
  clampSlippageBps,
  formatSlippagePercent,
  isQuoteStale,
  minReceivedUnits,
  parseSlippagePercent,
  resolveFreshQuote,
} from "@/lib/slippage";

describe("slippage tolerance math", () => {
  it("defaults to 0.5% and caps at 3%", () => {
    expect(DEFAULT_SLIPPAGE_BPS).toBe(50);
    expect(MAX_SLIPPAGE_BPS).toBe(300);
  });

  it("applies the default tolerance to a bigint quote", () => {
    expect(applySlippage(BigInt(10_000_000), 50)).toBe(BigInt(9_950_000));
  });

  it("rounds down so the bound is never tighter than requested", () => {
    expect(applySlippage(BigInt(999), 50)).toBe(BigInt(994));
  });

  it("returns the full quote at zero tolerance", () => {
    expect(applySlippage(BigInt(12345), 0)).toBe(BigInt(12345));
  });

  it("clamps tolerance above the maximum", () => {
    expect(applySlippage(BigInt(10_000), 9_999)).toBe(BigInt(9_700));
    expect(clampSlippageBps(500)).toBe(300);
  });

  it("falls back to the default for invalid tolerance", () => {
    expect(clampSlippageBps(Number.NaN)).toBe(DEFAULT_SLIPPAGE_BPS);
    expect(clampSlippageBps(-5)).toBe(DEFAULT_SLIPPAGE_BPS);
  });

  it("returns zero for a non-positive quote", () => {
    expect(applySlippage(BigInt(0), 50)).toBe(BigInt(0));
    expect(applySlippage(BigInt(-5), 50)).toBe(BigInt(0));
  });

  it("converts a whole-unit quote to stroops with tolerance applied", () => {
    expect(applySlippageToAmount(100, 50)).toBe(BigInt(995_000_000));
    expect(applySlippageToAmount(0.1, 100)).toBe(BigInt(990_000));
    expect(applySlippageToAmount(Number.NaN, 50)).toBe(BigInt(0));
  });

  it("reports minimum received in whole units", () => {
    expect(minReceivedUnits(200, 50)).toBeCloseTo(199, 7);
  });

  it("parses user input and rejects values above 3%", () => {
    expect(parseSlippagePercent("0.5")).toBe(50);
    expect(parseSlippagePercent("3")).toBe(300);
    expect(parseSlippagePercent("3.01")).toBeNull();
    expect(parseSlippagePercent("-1")).toBeNull();
    expect(parseSlippagePercent("abc")).toBeNull();
    expect(parseSlippagePercent("")).toBeNull();
  });

  it("formats basis points as a percent", () => {
    expect(formatSlippagePercent(50)).toBe("0.5");
    expect(formatSlippagePercent(100)).toBe("1");
    expect(formatSlippagePercent(10)).toBe("0.1");
  });
});

describe("stale quote handling", () => {
  it("treats a quote as stale only after the max age", () => {
    expect(isQuoteStale(1_000, 1_000 + QUOTE_MAX_AGE_MS)).toBe(false);
    expect(isQuoteStale(1_000, 1_001 + QUOTE_MAX_AGE_MS)).toBe(true);
  });

  it("reuses a fresh cached quote without fetching", async () => {
    const fetchQuote = vi.fn().mockResolvedValue("new");
    const cached = { value: "cached", fetchedAt: 10_000 };
    const result = await resolveFreshQuote(cached, fetchQuote, { now: 10_000 + 1_000 });
    expect(result).toBe(cached);
    expect(fetchQuote).not.toHaveBeenCalled();
  });

  it("re-fetches a stale cached quote", async () => {
    const fetchQuote = vi.fn().mockResolvedValue("new");
    const cached = { value: "cached", fetchedAt: 10_000 };
    const result = await resolveFreshQuote(cached, fetchQuote, {
      now: 10_000 + QUOTE_MAX_AGE_MS + 1,
    });
    expect(fetchQuote).toHaveBeenCalledTimes(1);
    expect(result.value).toBe("new");
  });

  it("fetches when nothing is cached", async () => {
    const fetchQuote = vi.fn().mockResolvedValue(42);
    const result = await resolveFreshQuote(null, fetchQuote);
    expect(result.value).toBe(42);
  });

  it("propagates a failed re-quote instead of signing a stale one", async () => {
    const fetchQuote = vi.fn().mockRejectedValue(new Error("rpc down"));
    await expect(
      resolveFreshQuote({ value: 1, fetchedAt: 0 }, fetchQuote, { now: QUOTE_MAX_AGE_MS + 1 })
    ).rejects.toThrow("rpc down");
  });
});
