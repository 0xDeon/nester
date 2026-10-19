import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ContractsSection } from "@/components/contracts-section";
import { NETWORKS, getLaunchContracts, type NetworkConfig } from "@/lib/networks";

const addr = (c: string) => `C${c.repeat(55)}`;
const hash = (c: string) => c.repeat(64);
const rowFor = (label: string) =>
  screen.getByRole("row", { name: new RegExp(`^${label}(?! token)`, "i") });

function withDeployment(base: NetworkConfig, seed: string): NetworkConfig {
  return {
    ...base,
    contracts: {
      vault: addr(seed),
      vaultToken: addr("B"),
      yieldRegistry: addr("C"),
      allocationStrategy: addr("D"),
      treasury: addr("E"),
      accessControl: addr("F"),
    },
    wasmHashes: { vault: hash("a"), treasury: hash("b") },
  };
}

describe.each([
  ["testnet", "https://stellar.expert/explorer/testnet"],
  ["mainnet", "https://stellar.expert/explorer/public"],
])("ContractsSection on %s", (id, expertBase) => {
  const network = withDeployment(NETWORKS[id], id === "testnet" ? "A" : "G");

  it("lists every launch contract from the network config with a stellar.expert link", () => {
    render(<ContractsSection network={network} />);
    for (const label of ["Vault", "Vault token", "Treasury", "Yield registry", "Allocation strategy", "Access control"]) {
      expect(rowFor(label)).toBeInTheDocument();
    }
    const vaultRow = rowFor("Vault");
    const link = within(vaultRow).getByRole("link", { name: "View Vault on stellar.expert" });
    expect(link).toHaveAttribute("href", `${expertBase}/contract/${network.contracts.vault}`);
    expect(vaultRow).toHaveTextContent(network.contracts.vault);
  });

  it("shows the WASM hash when known and a placeholder when not", () => {
    render(<ContractsSection network={network} />);
    expect(screen.getByRole("row", { name: /^Vault\b(?! token)/i })).toHaveTextContent(hash("a"));
    expect(rowFor("Vault token")).toHaveTextContent(/hash not published/i);
  });

  it("links to VERIFY.md", () => {
    render(<ContractsSection network={network} />);
    expect(screen.getByRole("link", { name: /verify/i })).toHaveAttribute(
      "href",
      expect.stringMatching(/VERIFY\.md$/)
    );
  });

  it("names the active network", () => {
    render(<ContractsSection network={network} />);
    expect(screen.getByText(new RegExp(network.name, "i"))).toBeInTheDocument();
  });
});

describe("getLaunchContracts", () => {
  it("marks unconfigured placeholder addresses as not deployed and gives them no link", () => {
    const placeholder: NetworkConfig = {
      ...NETWORKS.mainnet,
      contracts: { ...NETWORKS.mainnet.contracts, vault: "C_MAINNET_VAULT_PLACEHOLDER" },
      wasmHashes: {},
    };
    const vault = getLaunchContracts(placeholder).find((c) => c.key === "vault")!;
    expect(vault.deployed).toBe(false);
    expect(vault.explorerUrl).toBeNull();
  });

  it("reads addresses straight from the network config", () => {
    for (const net of Object.values(NETWORKS)) {
      const listed = getLaunchContracts(net);
      expect(listed.map((c) => c.address)).toEqual(
        expect.arrayContaining(Object.values(net.contracts))
      );
    }
  });
});
