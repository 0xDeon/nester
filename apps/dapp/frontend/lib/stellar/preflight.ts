import { Account, Asset, BASE_FEE, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

import { signTransaction, submitTransaction } from "@/lib/stellar/transaction";

export const BASE_RESERVE_XLM = 0.5;
export const TRUSTLINE_RESERVE_XLM = 0.5;
/** Buffer covering the inclusion fee plus Soroban resource fees for a deposit. */
export const ESTIMATED_FEE_XLM = 0.1;

export const USDC_ISSUER = process.env.NEXT_PUBLIC_USDC_ISSUER ?? "";

export interface PreflightAccount {
  xlmBalance: number;
  subentryCount: number;
  numSponsoring: number;
  numSponsored: number;
  sellingLiabilitiesXlm: number;
  usdc: { balance: number } | null;
}

export type PreflightResult =
  | { status: "ready" }
  | { status: "no_account" }
  | { status: "no_trustline" }
  | { status: "insufficient_usdc"; balance: number; required: number }
  | { status: "insufficient_xlm"; requiredXlm: number; availableXlm: number };

export type PreflightStatus = PreflightResult["status"];

function spendableXlm(account: PreflightAccount): number {
  const reserve =
    (2 + account.subentryCount + account.numSponsoring - account.numSponsored) * BASE_RESERVE_XLM;
  return account.xlmBalance - reserve - account.sellingLiabilitiesXlm;
}

export function evaluatePreflight(params: {
  account: PreflightAccount | null;
  asset: "USDC" | "XLM";
  amount: number;
}): PreflightResult {
  const { account, asset, amount } = params;
  if (!account) return { status: "no_account" };

  const available = spendableXlm(account);

  if (asset === "USDC") {
    if (!account.usdc) {
      const requiredXlm = TRUSTLINE_RESERVE_XLM + ESTIMATED_FEE_XLM;
      if (available < requiredXlm) {
        return { status: "insufficient_xlm", requiredXlm, availableXlm: Math.max(available, 0) };
      }
      return { status: "no_trustline" };
    }
    if (account.usdc.balance < amount) {
      return { status: "insufficient_usdc", balance: account.usdc.balance, required: amount };
    }
  }

  const requiredXlm = ESTIMATED_FEE_XLM + (asset === "XLM" ? amount : 0);
  if (available < requiredXlm) {
    return { status: "insufficient_xlm", requiredXlm, availableXlm: Math.max(available, 0) };
  }
  return { status: "ready" };
}

const fmt = (n: number) => n.toFixed(2);

export function preflightMessage(result: PreflightResult): string | null {
  switch (result.status) {
    case "ready":
      return null;
    case "no_account":
      return "This wallet is not funded on this network yet. Fund it with at least 2 XLM to activate the account before depositing.";
    case "no_trustline":
      return `Your wallet has no USDC trustline. Add one first (it reserves ${fmt(TRUSTLINE_RESERVE_XLM)} XLM and costs a tiny network fee), then deposit.`;
    case "insufficient_usdc":
      return `Your USDC trustline holds ${fmt(result.balance)} USDC but this deposit needs ${fmt(result.required)} USDC.`;
    case "insufficient_xlm":
      return `You need ${fmt(result.requiredXlm)} XLM above the account minimum balance for network fees, but only ${fmt(result.availableXlm)} XLM is available. Add more XLM to continue.`;
  }
}

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  selling_liabilities?: string;
}

interface HorizonAccount {
  subentry_count?: number;
  num_sponsoring?: number;
  num_sponsored?: number;
  balances?: HorizonBalance[];
}

export async function fetchPreflightAccount(
  horizonUrl: string,
  address: string,
  usdcIssuer: string = USDC_ISSUER,
): Promise<PreflightAccount | null> {
  const res = await fetch(`${horizonUrl}/accounts/${address}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Horizon account lookup failed (${res.status})`);
  const data = (await res.json()) as HorizonAccount;
  const balances = data.balances ?? [];
  const native = balances.find((b) => b.asset_type === "native");
  const usdc = balances.find(
    (b) =>
      b.asset_type !== "native" &&
      b.asset_code === "USDC" &&
      (!usdcIssuer || b.asset_issuer === usdcIssuer),
  );
  return {
    xlmBalance: native ? parseFloat(native.balance) : 0,
    subentryCount: data.subentry_count ?? 0,
    numSponsoring: data.num_sponsoring ?? 0,
    numSponsored: data.num_sponsored ?? 0,
    sellingLiabilitiesXlm: native?.selling_liabilities ? parseFloat(native.selling_liabilities) : 0,
    usdc: usdc ? { balance: parseFloat(usdc.balance) } : null,
  };
}

/** Build, sign and submit a changeTrust operation adding the USDC trustline. */
export async function addUsdcTrustline(params: {
  horizonUrl: string;
  networkPassphrase: string;
  address: string;
  usdcIssuer?: string;
}): Promise<void> {
  const issuer = params.usdcIssuer ?? USDC_ISSUER;
  if (!issuer) throw new Error("USDC issuer is not configured.");

  const res = await fetch(`${params.horizonUrl}/accounts/${params.address}`);
  if (!res.ok) throw new Error(`Horizon account lookup failed (${res.status})`);
  const { sequence } = (await res.json()) as { sequence: string };

  const tx = new TransactionBuilder(new Account(params.address, sequence), {
    fee: BASE_FEE,
    networkPassphrase: params.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset: new Asset("USDC", issuer) }))
    .setTimeout(180)
    .build();

  const signedXdr = await signTransaction(tx.toXDR());
  await submitTransaction(signedXdr);
}
