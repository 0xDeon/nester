"use client";

import { useWallet } from "@/components/wallet-provider";
import { Navbar } from "@/components/navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { truncateAddress } from "@/lib/utils";
import { Sparkles, ArrowRight } from "lucide-react";

// Mock Data
import { 
    mockTransactions, 
    mockVaultPositions, 
    mockPortfolioStats 
} from "@/lib/mock-data";

// Components
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { VaultPositionsTable } from "@/components/dashboard/vault-positions-table";
import { PortfolioCharts } from "@/components/dashboard/portfolio-charts";
import { RecentActivity } from "@/components/dashboard/recent-activity";

export default function Dashboard() {
    const { isConnected, address } = useWallet();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isConnected) {
            router.push("/");
        } else {
            // Simulate initial data fetch
            const timer = setTimeout(() => setIsLoading(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isConnected, router]);

    if (!isConnected) return null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="mx-auto max-w-[1536px] px-4 md:px-8 lg:px-12 xl:px-16 pt-28 pb-16">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-10"
                >
                    <h1 className="font-heading text-2xl font-light text-foreground sm:text-3xl">
                        Welcome back
                    </h1>
                    <p className="mt-1 text-muted-foreground font-mono text-xs opacity-60">
                        {address ? truncateAddress(address, 12) : ""}
                    </p>
                </motion.div>

                {/* Portfolio Content */}
                <div className="flex flex-col gap-10">
                    <DashboardStats stats={mockPortfolioStats} loading={isLoading} />
                    
                    <div className="grid gap-8">
                        {/* Charts Area */}
                        <motion.section
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.4 }}
                        >
                            <PortfolioCharts positions={mockVaultPositions} />
                        </motion.section>

                        <div className="grid gap-8 lg:grid-cols-3">
                            {/* Positions List */}
                            <motion.div 
                                className="lg:col-span-2"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                            >
                                <VaultPositionsTable positions={mockVaultPositions} />
                            </motion.div>

                            {/* Prometheus Column */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.8 }}
                                className="flex flex-col gap-8"
                            >
                                {/* AI Insights Card */}
                                <div className="rounded-2xl border border-border bg-white p-6 shadow-sm border-emerald-100 bg-gradient-to-br from-white via-white to-emerald-50/20 relative overflow-hidden group">
                                    <div className="mb-6 flex items-center justify-between relative z-10">
                                        <h2 className="font-heading text-lg font-light text-foreground">
                                            <span className="font-display italic">Prometheus</span> Insights
                                        </h2>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                                            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">
                                                AI Advisory
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 relative z-10">
                                        <div className="p-3.5 rounded-xl bg-white border border-border/60 hover:border-emerald-200 transition-colors cursor-pointer group/item shadow-sm shadow-emerald-900/5">
                                            <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                                                <Sparkles className="h-3 w-3 text-emerald-500" />
                                                Yield Opportunity
                                            </p>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                Move $12k USDC from Balanced Growth to DeFi500 to capture 4.2% higher APY.
                                            </p>
                                            <div className="mt-2 flex items-center text-[10px] font-bold text-emerald-600 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                Execute Rebalance <ArrowRight className="ml-1 h-3 w-3" />
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-xl bg-white border border-border/60 hover:border-emerald-200 transition-colors cursor-pointer group/item shadow-sm shadow-emerald-900/5">
                                            <p className="text-xs font-semibold text-foreground mb-1 flex items-center gap-2">
                                                <Sparkles className="h-3 w-3 text-emerald-500" />
                                                Risk Alert
                                            </p>
                                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                                Diversify XLM positions. Current concentration exceeds recommended 30% threshold.
                                            </p>
                                            <div className="mt-2 flex items-center text-[10px] font-bold text-emerald-600 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                View Strategy <ArrowRight className="ml-1 h-3 w-3" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Recent Activity Full Width */}
                        <motion.section
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 1 }}
                        >
                            <RecentActivity transactions={mockTransactions} />
                        </motion.section>
                    </div>
                </div>
            </main>
        </div>
    );
}
