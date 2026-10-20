import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluatePreflight,
  fetchPreflightAccount,
  preflightMessage,
  TRUSTLINE_RESERVE_XLM,
  ESTIMATED_FEE_XLM,
  type PreflightAccount,
} from "@/lib/stellar/preflight";

vi.mock("@/lib/stellar/transaction", () => ({
  signTransaction: vi.fn(),
  submitTransaction: vi.fn(),
}));

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

function account(overrides: Partial<PreflightAccount> = {}): PreflightAccount {
  return {
    xlmBalance: 10,
    subentryCount: 1,
    numSponsoring: 0,
    numSponsored: 0,
    sellingLiabilitiesXlm: 0,
    usdc: { balance: 500 },
    ...overrides,
  };
}

describe("evaluatePreflight", () => {
  it("reports no_account when the account is not funded", () => {
    expect(evaluatePreflight({ account: null, asset: "USDC", amount: 10 }).status).toBe("no_account");
  });

  it("reports no_trustline when USDC trustline is missing", () => {
    const r = evaluatePreflight({ account: account({ usdc: null }), asset: "USDC", amount: 10 });
    expect(r.status).toBe("no_trustline");
  });

  it("reports insufficient_xlm for a missing trustline when XLM cannot cover the new reserve", () => {
    const r = evaluatePreflight({ account: account({ xlmBalance: 1.6, usdc: null }), asset: "USDC", amount: 10 });
    expect(r.status).toBe("insufficient_xlm");
    if (r.status === "insufficient_xlm") {
      expect(r.requiredXlm).toBeCloseTo(TRUSTLINE_RESERVE_XLM + ESTIMATED_FEE_XLM, 5);
      expect(r.availableXlm).toBeCloseTo(0.1, 5);
    }
  });

  it("reports insufficient_usdc when the trustline balance is below the amount", () => {
    const r = evaluatePreflight({ account: account({ usdc: { balance: 5 } }), asset: "USDC", amount: 10 });
    expect(r).toMatchObject({ status: "insufficient_usdc", balance: 5 });
  });

  it("reports insufficient_xlm when spendable XLM is below the fee", () => {
    const r = evaluatePreflight({ account: account({ xlmBalance: 1.55 }), asset: "USDC", amount: 10 });
    expect(r.status).toBe("insufficient_xlm");
    if (r.status === "insufficient_xlm") expect(r.requiredXlm).toBeCloseTo(ESTIMATED_FEE_XLM, 5);
  });

  it("accounts for subentries, sponsorship and selling liabilities in the reserve", () => {
    const r = evaluatePreflight({
      account: account({ xlmBalance: 3, subentryCount: 3, numSponsoring: 1, numSponsored: 0, sellingLiabilitiesXlm: 0.2 }),
      asset: "USDC",
      amount: 10,
    });
    expect(r.status).toBe("insufficient_xlm");
  });

  it("is ready when trustline, USDC and XLM all suffice", () => {
    expect(evaluatePreflight({ account: account(), asset: "USDC", amount: 10 }).status).toBe("ready");
  });

  it("ignores the trustline for XLM deposits but requires amount plus fee", () => {
    expect(evaluatePreflight({ account: account({ usdc: null }), asset: "XLM", amount: 5 }).status).toBe("ready");
    expect(evaluatePreflight({ account: account({ usdc: null }), asset: "XLM", amount: 8.6 }).status).toBe(
      "insufficient_xlm",
    );
  });
});

describe("preflightMessage", () => {
  it("has copy for every state", () => {
    expect(preflightMessage({ status: "no_account" })).toMatch(/fund/i);
    expect(preflightMessage({ status: "no_trustline" })).toMatch(/USDC trustline/);
    expect(preflightMessage({ status: "insufficient_usdc", balance: 5, required: 10 })).toMatch(/5\.00 USDC.*10\.00/);
    expect(preflightMessage({ status: "insufficient_xlm", requiredXlm: 0.6, availableXlm: 0.1 })).toMatch(
      /0\.60 XLM.*0\.10 XLM/,
    );
    expect(preflightMessage({ status: "ready" })).toBeNull();
  });
});

describe("fetchPreflightAccount", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns null for a 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await fetchPreflightAccount("https://h", "GX", ISSUER)).toBeNull();
  });

  it("parses balances, reserve fields and matches the USDC issuer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          subentry_count: 2,
          num_sponsoring: 1,
          num_sponsored: 0,
          balances: [
            { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: "GOTHER", balance: "99" },
            { asset_type: "credit_alphanum4", asset_code: "USDC", asset_issuer: ISSUER, balance: "12.5" },
            { asset_type: "native", balance: "20.0", selling_liabilities: "0.5" },
          ],
        }),
      }),
    );
    const acc = await fetchPreflightAccount("https://h", "GX", ISSUER);
    expect(acc).toEqual({
      xlmBalance: 20,
      subentryCount: 2,
      numSponsoring: 1,
      numSponsored: 0,
      sellingLiabilitiesXlm: 0.5,
      usdc: { balance: 12.5 },
    });
  });

  it("throws on non-404 failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchPreflightAccount("https://h", "GX", ISSUER)).rejects.toThrow();
  });
});
