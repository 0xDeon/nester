import { describe, it, expect, vi, beforeEach } from "vitest";
import { Account, StrKey, scValToNative } from "@stellar/stellar-sdk";

const simulateTransaction = vi.fn();

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: class {
        getAccount = async (address: string) => new Account(address, "1");
        simulateTransaction = simulateTransaction;
      },
      assembleTransaction: (tx: unknown) => ({ build: () => tx }),
    },
  };
});

import {
  buildDepositTransaction,
  buildWithdrawTransaction,
  resolveDepositMinSharesOut,
} from "@/lib/stellar/transaction";

const walletAddress = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 1));
const contractId = StrKey.encodeContract(Buffer.alloc(32, 7));

function invokeArgs(tx: { operations: unknown[] }) {
  const op = tx.operations[0] as {
    func: { invokeContract: () => { functionName: () => Buffer; args: () => unknown[] } };
  };
  const invocation = op.func.invokeContract();
  return {
    name: invocation.functionName().toString(),
    args: invocation.args() as Parameters<typeof scValToNative>[0][],
  };
}

describe("vault transaction arguments", () => {
  beforeEach(() => {
    simulateTransaction.mockReset();
    simulateTransaction.mockResolvedValue({ id: "sim", latestLedger: 1 });
  });

  it("builds deposit with three args including min_shares_out", async () => {
    const { transaction } = await buildDepositTransaction({
      walletAddress,
      contractId,
      amount: BigInt(50_000_000),
      minSharesOut: BigInt(49_750_000),
    });

    const { name, args } = invokeArgs(transaction);
    expect(name).toBe("deposit");
    expect(args).toHaveLength(3);
    expect(scValToNative(args[0])).toBe(walletAddress);
    expect(scValToNative(args[1])).toBe(BigInt(50_000_000));
    expect(scValToNative(args[2])).toBe(BigInt(49_750_000));
  });

  it("builds withdraw with min_assets_out as the third arg", async () => {
    const { transaction } = await buildWithdrawTransaction({
      walletAddress,
      contractId,
      shares: BigInt(10_000_000),
      minAssetsOut: BigInt(9_950_000),
    });

    const { name, args } = invokeArgs(transaction);
    expect(name).toBe("withdraw");
    expect(args).toHaveLength(3);
    expect(scValToNative(args[2])).toBe(BigInt(9_950_000));
  });

  it("derives min_shares_out from preview_deposit minus tolerance", async () => {
    simulateTransaction.mockResolvedValue({
      id: "sim",
      latestLedger: 1,
      result: { retval: (await import("@stellar/stellar-sdk")).nativeToScVal(BigInt(10_000_000), { type: "i128" }) },
    });

    const { minSharesOut } = await resolveDepositMinSharesOut(
      { walletAddress, contractId, amount: BigInt(10_000_000) },
      50
    );
    expect(minSharesOut).toBe(BigInt(9_950_000));
  });

  it("re-quotes when the cached preview is stale", async () => {
    simulateTransaction.mockResolvedValue({
      id: "sim",
      latestLedger: 1,
      result: { retval: (await import("@stellar/stellar-sdk")).nativeToScVal(BigInt(20_000_000), { type: "i128" }) },
    });

    const { minSharesOut } = await resolveDepositMinSharesOut(
      { walletAddress, contractId, amount: BigInt(20_000_000) },
      100,
      { value: BigInt(1), fetchedAt: Date.now() - 60_000 }
    );
    expect(simulateTransaction).toHaveBeenCalledTimes(1);
    expect(minSharesOut).toBe(BigInt(19_800_000));
  });

  it("uses the cached preview while it is fresh", async () => {
    const { minSharesOut } = await resolveDepositMinSharesOut(
      { walletAddress, contractId, amount: BigInt(10_000_000) },
      50,
      { value: BigInt(10_000_000), fetchedAt: Date.now() }
    );
    expect(simulateTransaction).not.toHaveBeenCalled();
    expect(minSharesOut).toBe(BigInt(9_950_000));
  });

  it("refuses to build an unbounded deposit when no quote is available", async () => {
    simulateTransaction.mockResolvedValue({ id: "sim", error: "HostError" });
    await expect(
      resolveDepositMinSharesOut({ walletAddress, contractId, amount: BigInt(10_000_000) }, 50)
    ).rejects.toThrow(/current deposit quote/);
  });
});
