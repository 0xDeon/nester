import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NetworkBanner } from "@/components/network/NetworkSelector";
import { NETWORKS } from "@/lib/networks";

let currentNetwork = NETWORKS.testnet;

vi.mock("@/hooks/useNetwork", () => ({
  useNetwork: () => ({ currentNetwork, setNetwork: vi.fn() }),
}));
vi.mock("@/components/wallet-provider", () => ({
  useWallet: () => ({ disconnect: vi.fn(), isConnected: false }),
}));
vi.mock("@/components/notifications-provider", () => ({
  useNotifications: () => ({ addNotification: vi.fn() }),
}));

describe("NetworkBanner", () => {
  beforeEach(() => {
    currentNetwork = NETWORKS.testnet;
  });

  it("tells testnet users tokens have no real value", () => {
    render(<NetworkBanner />);
    expect(screen.getByText(/tokens have no real value/i)).toBeInTheDocument();
  });

  it("does not use the testnet copy on mainnet", () => {
    currentNetwork = NETWORKS.mainnet;
    render(<NetworkBanner />);
    expect(screen.queryByText(/tokens have no real value/i)).not.toBeInTheDocument();
  });

  it("warns mainnet users about real funds, contract risk, the vault cap and irreversibility", () => {
    currentNetwork = NETWORKS.mainnet;
    render(<NetworkBanner />);
    const banner = screen.getByTestId("network-banner");
    expect(banner).toHaveTextContent(/real funds/i);
    expect(banner).toHaveTextContent(/smart contract risk/i);
    expect(banner).toHaveTextContent(/vault cap/i);
    expect(banner).toHaveTextContent(/irreversible/i);
  });

  it("links mainnet users to security, risk disclosures and terms", () => {
    currentNetwork = NETWORKS.mainnet;
    render(<NetworkBanner />);
    expect(screen.getByRole("link", { name: /security/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/security$/),
    );
    expect(screen.getByRole("link", { name: /risk disclosures/i })).toHaveAttribute(
      "href",
      expect.stringContaining("docs/security/mainnet-risk-disclosures.md"),
    );
    expect(screen.getByRole("link", { name: /terms/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/terms$/),
    );
  });
});
