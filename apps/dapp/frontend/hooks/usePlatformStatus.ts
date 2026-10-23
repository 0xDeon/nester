"use client";

import { useEffect, useState } from "react";

import config from "@/lib/config";
import type { PlatformStatus } from "@/lib/platform-status";

export const STATUS_POLL_INTERVAL_MS = 30_000;

/**
 * Polls the public /status endpoint. Returns null until the first successful
 * response; a failed poll keeps the last known status rather than flashing a
 * banner for a transient client-side error.
 */
export function usePlatformStatus(): PlatformStatus | null {
  const [status, setStatus] = useState<PlatformStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${config.apiUrl}/status`, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const body = (await res.json()) as { data?: PlatformStatus };
        if (!cancelled && body.data) setStatus(body.data);
      } catch {
        // keep last known status
      }
    };

    poll();
    const id = setInterval(poll, STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return status;
}
