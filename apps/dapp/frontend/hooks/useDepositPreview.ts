"use client";

import { useEffect, useState } from "react";
import { previewDeposit, type DepositQuoteParams } from "@/lib/stellar/transaction";

const DEBOUNCE_MS = 500;

interface DepositPreview {
  sharesExpected: bigint;
  available: boolean;
  error?: string;
  fetchedAt: number;
}

/**
 * Simulated expected shares for a deposit amount (Issue #1129), instead of
 * assuming shares received == amount deposited.
 */
export function useDepositPreview(params: DepositQuoteParams | null, enabled: boolean) {
  const [preview, setPreview] = useState<DepositPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !params) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const result = await previewDeposit(params);
        if (!cancelled) setPreview({ ...result, fetchedAt: Date.now() });
      } catch {
        if (!cancelled) {
          setPreview({
            sharesExpected: BigInt(0),
            available: false,
            error: "Deposit preview unavailable",
            fetchedAt: Date.now(),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, params]);

  return { preview, loading };
}
