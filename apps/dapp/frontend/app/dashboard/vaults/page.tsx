"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp, ShieldCheck, ArrowDown, Vault as VaultIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Navbar } from "@/components/navbar";
import { useWallet } from "@/components/wallet-provider";
import { DepositModal } from "@/components/vault-action-modals";
import { usePortfolio } from "@/components/portfolio-provider";
import { vaultDefinitions, type VaultDefinition } from "@/lib/vault-data";

export default function VaultsPage() {
    const { isConnected } = useWallet();
    const { positions } = usePortfolio();
    const router = useRouter();
    const [selectedVault, setSelectedVault] = useState<VaultDefinition | null>(null);

    useEffect(() => {
        if (!isConnected) {
            router.push("/");
        }
    }, [isConnected, router]);

    const exposureByVault = useMemo(() => {
        return positions.reduce<Record<string, number>>((acc, position) => {
            acc[position.vaultId] = (acc[position.vaultId] ?? 0) + position.currentValue;
            return acc;
        }, {});
    }, [positions]);

    if (!isConnected) return null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-[1536px] px-4 pb-16 pt-28 md:px-8 lg:px-12 xl:px-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-10"
                >
                    <div className="mb-2 flex items-center gap-2 text-primary">
                        <VaultIcon className="h-4 w-4" />
                        <span className="text-xs font-mono font-medium uppercase tracking-wider">
                            Vaults Engine
                        </span>
                    </div>
                    <h1 className="font-heading text-3xl font-light text-foreground sm:text-4xl">
                        Optimize your Yield
                    </h1>
                    <p className="mt-2 max-w-2xl text-muted-foreground">
                        Choose a vault, review its maturity terms, and simulate the wallet signing flow before live contracts are deployed.
                    </p>
                </motion.div>

                <div className="grid gap-6 sm:grid-cols-2">
                    {vaultDefinitions.map((vault, index) => {
                        const currentExposure = exposureByVault[vault.id] ?? 0;

                        return (
                            <motion.div
                                key={vault.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: index * 0.08 }}
                                className="group relative overflow-hidden rounded-3xl border border-border bg-white p-8 transition-all hover:border-black/15 hover:shadow-xl"
                            >
                                <div className="flex h-full flex-col">
                                    <div className="mb-6 flex items-start justify-between">
                                        <div className="rounded-2xl bg-secondary p-3 text-foreground/70">
                                            <vault.icon className="h-6 w-6" />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium uppercase tracking-tight text-muted-foreground">
                                                target apy
                                            </p>
                                            <p className="font-heading text-3xl font-light text-emerald-600">
                                                {vault.apyLabel}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-8">
                                        <h3 className="mb-2 text-xl font-heading font-light text-foreground">
                                            {vault.name}
                                        </h3>
                                        <p className="h-12 overflow-hidden text-sm leading-relaxed text-muted-foreground">
                                            {vault.description}
                                        </p>
                                    </div>

                                    <div className="mb-6 mt-auto flex flex-wrap gap-2 border-t border-border pt-6">
                                        {vault.strategies.map((strategy) => (
                                            <span
                                                key={strategy}
                                                className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase text-foreground/60"
                                            >
                                                {strategy}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Lock period</span>
                                            <span className="font-medium text-foreground">
                                                {vault.lockDays} days
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Early exit penalty</span>
                                            <span className="font-medium text-foreground">
                                                {vault.earlyWithdrawalPenaltyPct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Your current exposure</span>
                                            <span className="font-medium text-foreground">
                                                {currentExposure.toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{" "}
                                                USDC
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className={`h-1.5 w-1.5 rounded-full ${
                                                    vault.risk === "Low"
                                                        ? "bg-emerald-500"
                                                        : vault.risk === "Medium"
                                                          ? "bg-blue-500"
                                                          : vault.risk === "Moderate High"
                                                            ? "bg-orange-500"
                                                            : "bg-purple-500"
                                                }`}
                                            />
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {vault.risk} Risk
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedVault(vault)}
                                            className="flex items-center gap-1.5 text-sm font-medium text-foreground transition-all hover:gap-2"
                                        >
                                            Deposit <ArrowUpRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="mt-12 rounded-3xl border border-border bg-secondary/30 p-8"
                >
                    <div className="grid gap-8 lg:grid-cols-3">
                        <div className="flex flex-col gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <h4 className="font-heading font-medium text-foreground">
                                Auto-Rebalancing
                            </h4>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                The deposit flow previews yield terms while keeping the signing and submission steps mockable until contracts are live on testnet.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white">
                                <ShieldCheck className="h-5 w-5 text-blue-600" />
                            </div>
                            <h4 className="font-heading font-medium text-foreground">
                                Risk Guarded
                            </h4>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Maturity dates and early withdrawal penalties are surfaced before every deposit so the withdrawal flow stays transparent.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white">
                                <ArrowDown className="h-5 w-5 text-purple-600" />
                            </div>
                            <h4 className="font-heading font-medium text-foreground">
                                Flexible Liquidity
                            </h4>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Deposits mint nVault shares 1:1 in mock mode. Later, the same UI can swap to live Soroban contract calls without changing the user journey.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </main>

            <DepositModal
                open={!!selectedVault}
                onClose={() => setSelectedVault(null)}
                vault={selectedVault}
            />
        </div>
    );
}

