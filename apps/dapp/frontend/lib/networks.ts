export interface NetworkConfig {
  id: 'testnet' | 'mainnet';
  name: string;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  explorerUrl: string;
  /** stellar.expert explorer base URL for this network. */
  stellarExpertUrl: string;
  friendbotUrl?: string;
  contracts: {
    vault: string;
    vaultToken: string;
    yieldRegistry: string;
    allocationStrategy: string;
    treasury: string;
    accessControl: string;
  };
  /** Published WASM hashes for the deployed contracts, when known. */
  wasmHashes: Partial<Record<keyof NetworkConfig['contracts'], string>>;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  testnet: {
    id: 'testnet',
    name: 'Testnet',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    explorerUrl: 'https://testnet.stellarchain.io',
    stellarExpertUrl: 'https://stellar.expert/explorer/testnet',
    friendbotUrl: 'https://friendbot.stellar.org',
    contracts: {
      vault: process.env.NEXT_PUBLIC_TESTNET_VAULT_CONTRACT || 'C_TESTNET_VAULT_PLACEHOLDER',
      vaultToken: process.env.NEXT_PUBLIC_TESTNET_VAULT_TOKEN_CONTRACT || 'C_TESTNET_VAULT_TOKEN_PLACEHOLDER',
      yieldRegistry: process.env.NEXT_PUBLIC_TESTNET_YIELD_REGISTRY_CONTRACT || 'C_TESTNET_YIELD_REGISTRY_PLACEHOLDER',
      allocationStrategy: process.env.NEXT_PUBLIC_TESTNET_ALLOCATION_STRATEGY_CONTRACT || 'C_TESTNET_ALLOCATION_STRATEGY_PLACEHOLDER',
      treasury: process.env.NEXT_PUBLIC_TESTNET_TREASURY_CONTRACT || 'C_TESTNET_TREASURY_PLACEHOLDER',
      accessControl: process.env.NEXT_PUBLIC_TESTNET_ACCESS_CONTROL_CONTRACT || 'C_TESTNET_ACCESS_CONTROL_PLACEHOLDER',
    },
    wasmHashes: {
      vault: process.env.NEXT_PUBLIC_TESTNET_VAULT_WASM_HASH,
      vaultToken: process.env.NEXT_PUBLIC_TESTNET_VAULT_TOKEN_WASM_HASH,
      yieldRegistry: process.env.NEXT_PUBLIC_TESTNET_YIELD_REGISTRY_WASM_HASH,
      allocationStrategy: process.env.NEXT_PUBLIC_TESTNET_ALLOCATION_STRATEGY_WASM_HASH,
      treasury: process.env.NEXT_PUBLIC_TESTNET_TREASURY_WASM_HASH,
      accessControl: process.env.NEXT_PUBLIC_TESTNET_ACCESS_CONTROL_WASM_HASH,
    },
  },
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    rpcUrl: 'https://soroban-rpc.mainnet.stellar.org',
    horizonUrl: 'https://horizon.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    explorerUrl: 'https://stellarchain.io',
    stellarExpertUrl: 'https://stellar.expert/explorer/public',
    contracts: {
      vault: process.env.NEXT_PUBLIC_MAINNET_VAULT_CONTRACT || 'C_MAINNET_VAULT_PLACEHOLDER',
      vaultToken: process.env.NEXT_PUBLIC_MAINNET_VAULT_TOKEN_CONTRACT || 'C_MAINNET_VAULT_TOKEN_PLACEHOLDER',
      yieldRegistry: process.env.NEXT_PUBLIC_MAINNET_YIELD_REGISTRY_CONTRACT || 'C_MAINNET_YIELD_REGISTRY_PLACEHOLDER',
      allocationStrategy: process.env.NEXT_PUBLIC_MAINNET_ALLOCATION_STRATEGY_CONTRACT || 'C_MAINNET_ALLOCATION_STRATEGY_PLACEHOLDER',
      treasury: process.env.NEXT_PUBLIC_MAINNET_TREASURY_CONTRACT || 'C_MAINNET_TREASURY_PLACEHOLDER',
      accessControl: process.env.NEXT_PUBLIC_MAINNET_ACCESS_CONTROL_CONTRACT || 'C_MAINNET_ACCESS_CONTROL_PLACEHOLDER',
    },
    wasmHashes: {
      vault: process.env.NEXT_PUBLIC_MAINNET_VAULT_WASM_HASH,
      vaultToken: process.env.NEXT_PUBLIC_MAINNET_VAULT_TOKEN_WASM_HASH,
      yieldRegistry: process.env.NEXT_PUBLIC_MAINNET_YIELD_REGISTRY_WASM_HASH,
      allocationStrategy: process.env.NEXT_PUBLIC_MAINNET_ALLOCATION_STRATEGY_WASM_HASH,
      treasury: process.env.NEXT_PUBLIC_MAINNET_TREASURY_WASM_HASH,
      accessControl: process.env.NEXT_PUBLIC_MAINNET_ACCESS_CONTROL_WASM_HASH,
    },
  },
};

export const DEFAULT_NETWORK = NETWORKS.testnet;

export type LaunchContractKey = keyof NetworkConfig['contracts'];

export interface LaunchContract {
  key: LaunchContractKey;
  label: string;
  address: string;
  wasmHash: string | null;
  /** stellar.expert contract page; null while the address is unconfigured. */
  explorerUrl: string | null;
  deployed: boolean;
}

const LAUNCH_CONTRACT_LABELS: Record<LaunchContractKey, string> = {
  vault: 'Vault',
  vaultToken: 'Vault token',
  treasury: 'Treasury',
  yieldRegistry: 'Yield registry',
  allocationStrategy: 'Allocation strategy',
  accessControl: 'Access control',
};

const CONTRACT_ID = /^C[A-Z0-9]{55}$/;

/** Launch contracts for a network, in display order, straight from its config. */
export function getLaunchContracts(network: NetworkConfig): LaunchContract[] {
  return (Object.keys(LAUNCH_CONTRACT_LABELS) as LaunchContractKey[]).map((key) => {
    const address = network.contracts[key];
    const deployed = CONTRACT_ID.test(address);
    return {
      key,
      label: LAUNCH_CONTRACT_LABELS[key],
      address,
      wasmHash: network.wasmHashes[key]?.trim() || null,
      explorerUrl: deployed ? `${network.stellarExpertUrl}/contract/${address}` : null,
      deployed,
    };
  });
}
