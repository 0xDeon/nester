"use client";

import { useEffect, useRef } from "react";

/** Records when `quote` last changed, so a stale quote can be re-fetched before signing. */
export function useQuoteTimestamp(quote: unknown) {
  const fetchedAt = useRef(0);

  useEffect(() => {
    fetchedAt.current = Date.now();
  }, [quote]);

  return fetchedAt;
}
