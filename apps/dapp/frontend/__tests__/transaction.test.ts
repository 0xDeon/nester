import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const sendTransaction = vi.fn();
const getNetwork = vi.fn();
const walletSign = vi.fn();

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  class FakeServer {
    sendTransaction = sendTransaction;
    getTransaction = vi.fn();
  }
  return {
    ...actual,
    rpc: { ...actual.rpc, Server: FakeServer },
    Transaction: class FakeTransaction {},
  };
});

vi.mock("@creit.tech/stellar-wallets-kit", () => ({
  StellarWalletsKit: {
    selectedModule: {
      getAddress: async () => ({ address: "GTEST" }),
      getNetwork: (...args: unknown[]) => getNetwork(...args),
      signTransaction: (...args: unknown[]) => walletSign(...args),
    },
  },
}));

import { NETWORKS } from "@/lib/networks";
import {
  TX_TIMEOUT_SECONDS,
  TransactionExpiredError,
  WalletNetworkMismatchError,
  signTransaction,
  signWithExpiryRebuild,
  submitTransaction,
} from "@/lib/stellar/transaction";

function builtTx(maxTime: number, xdr = "xdr") {
  return { xdr, transaction: { timeBounds: { minTime: "0", maxTime: String(maxTime) } } };
}

describe("signTransaction wallet network guard", () => {
  beforeEach(() => {
    window.localStorage.setItem("nester_network_id", "mainnet");
    getNetwork.mockReset();
    walletSign.mockReset();
  });

  it("blocks signing when the wallet is on testnet and the dapp on mainnet", async () => {
    getNetwork.mockResolvedValue({
      network: "TESTNET",
      networkPassphrase: NETWORKS.testnet.networkPassphrase,
    });

    const err = await signTransaction("xdr").catch((e) => e);

    expect(err).toBeInstanceOf(WalletNetworkMismatchError);
    expect(err.message).toBe("Switch your wallet to Mainnet");
    expect(walletSign).not.toHaveBeenCalled();
  });

  it("signs when the wallet network matches", async () => {
    getNetwork.mockResolvedValue({
      network: "PUBLIC",
      networkPassphrase: NETWORKS.mainnet.networkPassphrase,
    });
    walletSign.mockResolvedValue({ signedTxXdr: "signed" });

    await expect(signTransaction("xdr")).resolves.toBe("signed");
  });

  it("does not block when the wallet cannot report its network", async () => {
    getNetwork.mockRejectedValue(new Error("not supported"));
    walletSign.mockResolvedValue({ signedTxXdr: "signed" });

    await expect(signTransaction("xdr")).resolves.toBe("signed");
  });
});

describe("signing expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const nowSec = () => Math.floor(Date.now() / 1000);

  it("uses a 180 second validity window", () => {
    expect(TX_TIMEOUT_SECONDS).toBe(180);
  });

  it("does not rebuild when the signer finishes before expiry", async () => {
    const build = vi.fn(async () => builtTx(nowSec() + TX_TIMEOUT_SECONDS));
    const sign = vi.fn(async () => "signed-1");

    await expect(signWithExpiryRebuild(build, sign)).resolves.toBe("signed-1");
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("rebuilds and re-signs when a delayed signer outlives the first transaction", async () => {
    const build = vi
      .fn()
      .mockImplementationOnce(async () => builtTx(nowSec() + TX_TIMEOUT_SECONDS, "first"))
      .mockImplementationOnce(async () => builtTx(nowSec() + TX_TIMEOUT_SECONDS, "second"));
    let calls = 0;
    const sign = vi.fn(async (xdr: string) => {
      calls++;
      if (calls === 1) await vi.advanceTimersByTimeAsync((TX_TIMEOUT_SECONDS + 5) * 1000);
      return `signed-${xdr}`;
    });

    await expect(signWithExpiryRebuild(build, sign)).resolves.toBe("signed-second");
    expect(build).toHaveBeenCalledTimes(2);
    expect(sign).toHaveBeenNthCalledWith(1, "first");
    expect(sign).toHaveBeenNthCalledWith(2, "second");
  });

  it("throws TransactionExpiredError when the rebuilt transaction also expires", async () => {
    const build = vi.fn(async () => builtTx(nowSec() + TX_TIMEOUT_SECONDS));
    const sign = vi.fn(async () => {
      await vi.advanceTimersByTimeAsync((TX_TIMEOUT_SECONDS + 5) * 1000);
      return "signed";
    });

    const err = await signWithExpiryRebuild(build, sign).catch((e) => e);

    expect(err).toBeInstanceOf(TransactionExpiredError);
    expect(err.message).toBe("Signing took too long, try again");
    expect(build).toHaveBeenCalledTimes(2);
  });
});

describe("submitTransaction txTooLate", () => {
  it("maps a txTooLate rejection to TransactionExpiredError", async () => {
    sendTransaction.mockResolvedValue({
      status: "ERROR",
      errorResult: {
        result: () => ({ switch: () => ({ name: "txTooLate" }) }),
        toXDR: () => "raw",
      },
    });

    await expect(submitTransaction("signed")).rejects.toBeInstanceOf(TransactionExpiredError);
  });
});
