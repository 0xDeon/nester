"use client";

import { AppShell } from "@/components/app-shell";
import { ContractsSection } from "@/components/contracts-section";

export default function SecurityPage() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold">Security</h1>
      <p className="mt-2 max-w-2xl text-sm text-black/70 dark:text-white/70">
        Phishing clones of DeFi apps count on you not checking what you sign. These are the
        contracts this app uses on the network you are connected to.
      </p>
      <ContractsSection />
    </AppShell>
  );
}
