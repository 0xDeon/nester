import { safeStorage } from "@/lib/storage";

export const BPS_DENOMINATOR = BigInt(10_000);
export const DEFAULT_SLIPPAGE_BPS = 50;
export const MAX_SLIPPAGE_BPS = 300;
export const QUOTE_MAX_AGE_MS = 15_000;
export const SLIPPAGE_STORAGE_KEY = "nester_slippage_bps";

const STROOPS_PER_UNIT = 10_000_000;

export function clampSlippageBps(bps: number): number {
  if (!Number.isFinite(bps) || bps < 0) return DEFAULT_SLIPPAGE_BPS;
  return Math.min(Math.round(bps), MAX_SLIPPAGE_BPS);
}

/** Parses a percent string such as "0.5" into basis points, or null when invalid or above the max. */
export function parseSlippagePercent(input: string): number | null {
  const trimmed = input.trim();
  const [whole, fraction = "", ...rest] = trimmed.split(".");
  if (rest.length > 0 || !/^\d+$/.test(whole) || fraction.length > 2 || !/^\d*$/.test(fraction)) {
    return null;
  }
  const bps = Math.round(Number(trimmed) * 100);
  return bps > MAX_SLIPPAGE_BPS ? null : bps;
}

export function formatSlippagePercent(bps: number): string {
  return (bps / 100).toFixed(2).replace(/\.?0+$/, "");
}

/** Lowest acceptable output for `expected` given a tolerance. Rounds down so the bound is never tighter than requested. */
export function applySlippage(expected: bigint, bps: number): bigint {
  if (expected <= BigInt(0)) return BigInt(0);
  const safeBps = BigInt(clampSlippageBps(bps));
  return (expected * (BPS_DENOMINATOR - safeBps)) / BPS_DENOMINATOR;
}

/** Same as applySlippage for a whole-unit amount (e.g. a withdrawal quote), returned in stroops. */
export function applySlippageToAmount(expectedUnits: number, bps: number): bigint {
  if (!Number.isFinite(expectedUnits) || expectedUnits <= 0) return BigInt(0);
  return applySlippage(BigInt(Math.round(expectedUnits * STROOPS_PER_UNIT)), bps);
}

export function isQuoteStale(
  fetchedAt: number,
  now: number = Date.now(),
  maxAgeMs: number = QUOTE_MAX_AGE_MS
): boolean {
  return now - fetchedAt > maxAgeMs;
}

export interface TimedQuote<T> {
  value: T;
  fetchedAt: number;
}

/** Returns the cached quote while it is fresh, otherwise fetches a new one. */
export async function resolveFreshQuote<T>(
  cached: TimedQuote<T> | null | undefined,
  fetchQuote: () => Promise<T> | T,
  options: { now?: number; maxAgeMs?: number } = {}
): Promise<TimedQuote<T>> {
  const now = options.now ?? Date.now();
  if (cached && !isQuoteStale(cached.fetchedAt, now, options.maxAgeMs)) return cached;
  return { value: await fetchQuote(), fetchedAt: Date.now() };
}

export function readSlippageBps(): number {
  return clampSlippageBps(safeStorage.get<number>(SLIPPAGE_STORAGE_KEY, DEFAULT_SLIPPAGE_BPS));
}

export function writeSlippageBps(bps: number): void {
  safeStorage.set(SLIPPAGE_STORAGE_KEY, clampSlippageBps(bps));
}

/** Minimum received for a whole-unit quote, as whole units for display. */
export function minReceivedUnits(expectedUnits: number, bps: number): number {
  return Number(applySlippageToAmount(expectedUnits, bps)) / STROOPS_PER_UNIT;
}
