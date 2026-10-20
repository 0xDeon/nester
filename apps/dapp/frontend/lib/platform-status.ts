export interface PlatformStatus {
  deposits_paused: boolean;
  withdrawals_paused: boolean;
  indexer_lag_ledgers: number | null;
  rpc_healthy: boolean;
}

/** About 4 minutes at 5s per ledger. */
export const INDEXER_LAG_THRESHOLD_LEDGERS = 50;

export type BannerKind = "deposits_paused" | "withdrawals_paused" | "all_paused" | "rpc_down" | "indexer_lag";

export interface BannerState {
  kind: BannerKind;
  severity: "error" | "warning";
  message: string;
}

export function deriveBanner(status: PlatformStatus | null): BannerState | null {
  if (!status) return null;

  if (status.deposits_paused && status.withdrawals_paused) {
    return {
      kind: "all_paused",
      severity: "error",
      message: "Deposits and withdrawals are temporarily paused.",
    };
  }

  if (status.deposits_paused) {
    return {
      kind: "deposits_paused",
      severity: "error",
      message: "Deposits are paused. Withdrawals remain available.",
    };
  }

  if (status.withdrawals_paused) {
    return {
      kind: "withdrawals_paused",
      severity: "error",
      message: "Withdrawals are paused. Deposits remain available.",
    };
  }

  if (!status.rpc_healthy) {
    return {
      kind: "rpc_down",
      severity: "error",
      message: "We are having trouble reaching the Stellar network. Transactions may fail and balances may be delayed.",
    };
  }

  if (status.indexer_lag_ledgers !== null && status.indexer_lag_ledgers > INDEXER_LAG_THRESHOLD_LEDGERS) {
    return {
      kind: "indexer_lag",
      severity: "warning",
      message: "Balances may be delayed while we catch up with the network.",
    };
  }

  return null;
}
