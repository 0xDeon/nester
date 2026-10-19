import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DepositModal } from "@/components/vault/depositModal";
import { NETWORKS } from "@/lib/networks";
import { acknowledgeMainnet } from "@/lib/mainnet-ack";
import { executeVaultDeposit } from "@/lib/stellar/transaction";
import type { Vault as VaultType } from "@/lib/types/vault";

const WALLET = "GABC1234567890123456789012345678901234567890123456789012345678";

vi.mock("@/hooks/useNetwork", () => ({
  useNetwork: () => ({ currentNetwork: NETWORKS.mainnet, setNetwork: vi.fn() }),
}));
vi.mock("@/components/wallet-provider", () => ({
  useWallet: () => ({ address: WALLET }),
}));
vi.mock("@/components/portfolio-provider", () => ({
  usePortfolio: () => ({
    getAvailableBalance: () => 1000,
    recordDeposit: vi.fn(),
    refreshBalances: vi.fn(),
  }),
}));
vi.mock("@/lib/stellar/transaction", () => ({
  executeVaultDeposit: vi.fn().mockResolvedValue({ hash: "abc", ledger: 1 }),
  UserRejectedError: class UserRejectedError extends Error {},
  TransactionFailedError: class TransactionFailedError extends Error {},
  TransactionTimeoutError: class TransactionTimeoutError extends Error {},
  truncateTxHash: (h: string) => h.slice(0, 8),
}));

const vault = {
  id: "usdc",
  name: "USDC Market",
  description: "Test market",
  marketType: "single",
  tokens: ["USDC"],
  currentApy: 10,
  apyRange: "8-12%",
  tvl: 1000000,
  utilization: 80,
  allocations: [],
  supportedAssets: ["USDC"],
  maturityTerms: "Flexible",
  earlyWithdrawalPenalty: "None",
  apyHistory: [],
  strategies: [],
  contractAddress: "C" + "A".repeat(55),
} as unknown as VaultType;

function enterAmountAndConfirm() {
  fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "100" } });
  fireEvent.click(screen.getByRole("button", { name: /confirm deposit/i }));
}

describe("DepositModal mainnet acknowledgement", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(executeVaultDeposit).mockClear();
  });

  it("asks for acknowledgement before the first mainnet deposit and does not submit", () => {
    render(<DepositModal open vault={vault} onClose={() => {}} />);
    enterAmountAndConfirm();
    expect(screen.getByRole("dialog", { name: /real funds/i })).toBeInTheDocument();
    expect(executeVaultDeposit).not.toHaveBeenCalled();
  });

  it("requires the checkbox before the acknowledgement can be confirmed", () => {
    render(<DepositModal open vault={vault} onClose={() => {}} />);
    enterAmountAndConfirm();
    expect(screen.getByRole("button", { name: /i understand, continue/i })).toBeDisabled();
  });

  it("submits the deposit after acknowledgement and remembers it for the wallet", async () => {
    render(<DepositModal open vault={vault} onClose={() => {}} />);
    enterAmountAndConfirm();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /i understand, continue/i }));
    await waitFor(() => expect(executeVaultDeposit).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem(`nester_mainnet_ack_v1:${WALLET}`)).not.toBeNull();
  });

  it("skips the acknowledgement for a wallet that already acknowledged", async () => {
    acknowledgeMainnet(WALLET);
    render(<DepositModal open vault={vault} onClose={() => {}} />);
    enterAmountAndConfirm();
    expect(screen.queryByRole("dialog", { name: /real funds/i })).not.toBeInTheDocument();
    await waitFor(() => expect(executeVaultDeposit).toHaveBeenCalledTimes(1));
  });
});
