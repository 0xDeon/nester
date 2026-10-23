"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SLIPPAGE_BPS,
  clampSlippageBps,
  readSlippageBps,
  writeSlippageBps,
} from "@/lib/slippage";

export function useSlippage() {
  const [bps, setBpsState] = useState(DEFAULT_SLIPPAGE_BPS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBpsState(readSlippageBps());
  }, []);

  const setBps = useCallback((next: number) => {
    const clamped = clampSlippageBps(next);
    setBpsState(clamped);
    writeSlippageBps(clamped);
  }, []);

  return { bps, setBps };
}
