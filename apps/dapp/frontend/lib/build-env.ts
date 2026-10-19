const CONTRACT_KEYS = [
  "VAULT",
  "VAULT_TOKEN",
  "YIELD_REGISTRY",
  "ALLOCATION_STRATEGY",
  "TREASURY",
  "ACCESS_CONTROL",
] as const;

const NETWORK_IDS = ["testnet", "mainnet"] as const;

type Env = Record<string, string | undefined>;

export function assertProductionBuildEnv(env: Env): void {
  if (env.NODE_ENV !== "production") return;

  const network = env.NEXT_PUBLIC_STELLAR_NETWORK;
  if (!network || !(NETWORK_IDS as readonly string[]).includes(network)) {
    throw new Error(
      `NEXT_PUBLIC_STELLAR_NETWORK must be one of ${NETWORK_IDS.join(", ")} for a production build (got ${
        network ? `"${network}"` : "nothing"
      }).`,
    );
  }

  const prefix = `NEXT_PUBLIC_${network.toUpperCase()}_`;
  const bad = CONTRACT_KEYS.map((key) => `${prefix}${key}_CONTRACT`).filter((name) => {
    const value = env[name];
    return !value || value.includes("PLACEHOLDER");
  });

  if (bad.length > 0) {
    throw new Error(
      `Production build for ${network} is missing contract IDs. Set:\n  ${bad.join("\n  ")}`,
    );
  }
}
