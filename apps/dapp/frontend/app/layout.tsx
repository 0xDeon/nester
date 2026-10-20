import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Inter } from "next/font/google";
import { PortfolioProvider } from "@/components/portfolio-provider";
import { WalletProvider } from "@/components/wallet-provider";
import { AuthProvider } from "@/components/auth-provider";
import { NotificationsProvider } from "@/components/notifications-provider";
import { NotificationsToaster } from "@/components/notifications-toaster";
import { WebSocketProvider } from "@/components/websocket-provider";
import { ReactQueryProvider } from "@/components/react-query-provider";
import { OfflineBanner } from "@/components/offline-banner";
import { StatusBanner } from "@/components/status-banner";
import { SettingsProvider } from "@/context/settings-context";
import { LocaleProvider } from "@/context/locale-context";
import { NetworkProvider } from "@/context/NetworkProvider";
import { NetworkBanner } from "@/components/network/NetworkSelector";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import {
    E2E_HARNESS_CHANNELS,
    E2E_HARNESS_TOKEN,
    E2E_HARNESS_ENABLED,
    E2E_HARNESS_HEARTBEAT_INTERVAL_MS,
    E2E_HARNESS_HEARTBEAT_TIMEOUT_MS,
} from "@/lib/e2e-harness";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "Nester | DApp",
    description:
        "Decentralized savings and yield investing powered by Stellar.",
    manifest: "/manifest.webmanifest",
    icons: {
        icon: "/logo.png",
        apple: "/logo.png",
    },
};

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
};

import { ToastProvider } from "@/components/ui/toast/toast-provider";


const themeInitScript = `
(function() {
  try {
    var key = 'nester-theme';
    var legacy = 'nester_theme';
    var stored = localStorage.getItem(key) || localStorage.getItem(legacy) || 'light';
    if (stored === 'system') {
      stored = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (stored === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Reading the per-request nonce opts the tree into dynamic rendering, which
    // the nonce-based CSP in proxy.ts requires: a prerendered page cannot carry
    // a nonce that changes on every request.
    const nonce = (await headers()).get("x-nonce") ?? undefined;
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <Script
                    id="theme-init"
                    nonce={nonce}
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: themeInitScript }}
                />
            </head>
            <body
                suppressHydrationWarning
                className={`${inter.className} ${inter.variable} antialiased`}
            >
                <ToastProvider>
                        <ReactQueryProvider>
                            <NetworkProvider>
                                <LocaleProvider>
                                    <SettingsProvider>
                                        <WalletProvider>
                                            <AuthProvider>
                                                <NotificationsProvider>
                                                    <ServiceWorkerRegister />
                                                    <OfflineBanner />
                                                    <NetworkBanner />
                                                    <StatusBanner />
                                                    <PortfolioProvider>
                                                        <WebSocketProvider
                                                            channelsOverride={
                                                                E2E_HARNESS_ENABLED
                                                                    ? E2E_HARNESS_CHANNELS
                                                                    : undefined
                                                            }
                                                            tokenOverride={
                                                                E2E_HARNESS_ENABLED
                                                                    ? E2E_HARNESS_TOKEN
                                                                    : undefined
                                                            }
                                                            heartbeatInterval={
                                                                E2E_HARNESS_ENABLED
                                                                    ? E2E_HARNESS_HEARTBEAT_INTERVAL_MS
                                                                    : undefined
                                                            }
                                                            heartbeatTimeout={
                                                                E2E_HARNESS_ENABLED
                                                                    ? E2E_HARNESS_HEARTBEAT_TIMEOUT_MS
                                                                    : undefined
                                                            }
                                                        >
                                                                {children}
                                                                <NotificationsToaster />
                                                        </WebSocketProvider>
                                                    </PortfolioProvider>
                                                </NotificationsProvider>
                                            </AuthProvider>
                                        </WalletProvider>
                                    </SettingsProvider>
                                </LocaleProvider>
                            </NetworkProvider>
                        </ReactQueryProvider>
                </ToastProvider>
            </body>
        </html>
    );
}
