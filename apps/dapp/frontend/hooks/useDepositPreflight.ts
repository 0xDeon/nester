"use client";

import { useCallback, useEffect, useState } from "react";

import { useNetwork } from "@/hooks/useNetwork";
import {
  evaluatePreflight,
  fetchPreflightAccount,
  type PreflightResult,
} from "@/lib/stellar/preflight";

interface Params {
  address: string | null | undefined;
  asset: "USDC" | "XLM";
  amount: number;
  enabled: boolean;
}

/**
 * Loads the account from Horizon and evaluates deposit preflight checks.
 * `result` stays null while loading or if Horizon is unreachable, so a flaky
 * lookup never blocks a deposit on its own.
 */
export function useDepositPreflight({ address, asset, amount, enabled }: Params) {
  const { currentNetwork } = useNetwork();
  const horizonUrl = currentNetwork.horizonUrl;
  const [account, setAccount] = useState<Awaited<ReturnType<typeof fetchPreflightAccount>> | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled || !address) return;
    let cancelled = false;
    fetchPreflightAccount(horizonUrl, address)
      .then((acc) => {
        if (!cancelled) setAccount(acc);
      })
      .catch(() => {
        if (!cancelled) setAccount(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, address, horizonUrl, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  const result: PreflightResult | null =
    enabled && address && account !== undefined ? evaluatePreflight({ account, asset, amount }) : null;

  return { result, refresh, horizonUrl, networkPassphrase: currentNetwork.networkPassphrase };
}
