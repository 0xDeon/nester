import { describe, it, expect } from "vitest";
import { assertProductionBuildEnv } from "@/lib/build-env";

const allMainnetContracts = {
  NEXT_PUBLIC_MAINNET_VAULT_CONTRACT: "CVAULT",
  NEXT_PUBLIC_MAINNET_VAULT_TOKEN_CONTRACT: "CTOKEN",
  NEXT_PUBLIC_MAINNET_YIELD_REGISTRY_CONTRACT: "CREG",
  NEXT_PUBLIC_MAINNET_ALLOCATION_STRATEGY_CONTRACT: "CALLOC",
  NEXT_PUBLIC_MAINNET_TREASURY_CONTRACT: "CTREAS",
  NEXT_PUBLIC_MAINNET_ACCESS_CONTROL_CONTRACT: "CACCESS",
};

describe("assertProductionBuildEnv", () => {
  it("does nothing outside production builds", () => {
    expect(() => assertProductionBuildEnv({ NODE_ENV: "development" })).not.toThrow();
  });

  it("throws when NEXT_PUBLIC_STELLAR_NETWORK is missing in production", () => {
    expect(() => assertProductionBuildEnv({ NODE_ENV: "production" })).toThrow(
      /NEXT_PUBLIC_STELLAR_NETWORK/,
    );
  });

  it("throws when NEXT_PUBLIC_STELLAR_NETWORK is not a known network", () => {
    expect(() =>
      assertProductionBuildEnv({ NODE_ENV: "production", NEXT_PUBLIC_STELLAR_NETWORK: "devnet" }),
    ).toThrow(/NEXT_PUBLIC_STELLAR_NETWORK/);
  });

  it("names every missing mainnet contract variable", () => {
    expect(() =>
      assertProductionBuildEnv({ NODE_ENV: "production", NEXT_PUBLIC_STELLAR_NETWORK: "mainnet" }),
    ).toThrow(/NEXT_PUBLIC_MAINNET_VAULT_CONTRACT[\s\S]*NEXT_PUBLIC_MAINNET_ACCESS_CONTROL_CONTRACT/);
  });

  it("throws when a contract id is still a placeholder", () => {
    expect(() =>
      assertProductionBuildEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
        ...allMainnetContracts,
        NEXT_PUBLIC_MAINNET_TREASURY_CONTRACT: "C_MAINNET_TREASURY_PLACEHOLDER",
      }),
    ).toThrow(/NEXT_PUBLIC_MAINNET_TREASURY_CONTRACT/);
  });

  it("passes when the selected network has every contract id", () => {
    expect(() =>
      assertProductionBuildEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_STELLAR_NETWORK: "mainnet",
        ...allMainnetContracts,
      }),
    ).not.toThrow();
  });

  it("only checks the selected network's contracts", () => {
    expect(() =>
      assertProductionBuildEnv({
        NODE_ENV: "production",
        NEXT_PUBLIC_STELLAR_NETWORK: "testnet",
        NEXT_PUBLIC_TESTNET_VAULT_CONTRACT: "CV",
        NEXT_PUBLIC_TESTNET_VAULT_TOKEN_CONTRACT: "CT",
        NEXT_PUBLIC_TESTNET_YIELD_REGISTRY_CONTRACT: "CR",
        NEXT_PUBLIC_TESTNET_ALLOCATION_STRATEGY_CONTRACT: "CA",
        NEXT_PUBLIC_TESTNET_TREASURY_CONTRACT: "CTR",
        NEXT_PUBLIC_TESTNET_ACCESS_CONTROL_CONTRACT: "CAC",
      }),
    ).not.toThrow();
  });
});
