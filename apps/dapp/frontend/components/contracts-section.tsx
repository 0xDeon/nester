"use client";

import { ExternalLink } from "lucide-react";
import { useNetwork } from "@/context/NetworkProvider";
import { getLaunchContracts, type NetworkConfig } from "@/lib/networks";

export const VERIFY_DOC_URL = "https://github.com/Suncrest-Labs/nester/blob/dev/VERIFY.md";

interface ContractsSectionProps {
  /** Defaults to the active network from NetworkProvider. */
  network?: NetworkConfig;
}

export function ContractsSection({ network }: ContractsSectionProps) {
  const active = useNetwork().currentNetwork;
  const net = network ?? active;
  const contracts = getLaunchContracts(net);

  return (
    <section aria-labelledby="contracts-heading" className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="contracts-heading" className="text-lg font-semibold">
          Contracts
        </h2>
        <span className="text-xs text-black/60 dark:text-white/60">
          {net.name} deployment
        </span>
      </div>
      <p className="mb-4 text-sm text-black/70 dark:text-white/70">
        Check these addresses against what your wallet asks you to sign.{" "}
        <a
          href={VERIFY_DOC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          How to verify (VERIFY.md)
        </a>
      </p>
      <div className="overflow-x-auto rounded-xl border border-black/8 dark:border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-black/3 text-xs text-black/60 dark:bg-white/3 dark:text-white/60">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Contract</th>
              <th scope="col" className="px-4 py-2 font-medium">Address</th>
              <th scope="col" className="px-4 py-2 font-medium">WASM hash</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.key} className="border-t border-black/8 align-top dark:border-white/8">
                <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium">
                  {c.label}
                </th>
                <td className="px-4 py-3">
                  {c.deployed && c.explorerUrl ? (
                    <div className="flex items-start gap-2">
                      <code className="break-all font-mono text-xs">{c.address}</code>
                      <a
                        href={c.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${c.label} on stellar.expert`}
                        className="shrink-0 text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-black/60 dark:text-white/60">
                      Not deployed on {net.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.wasmHash ? (
                    <code className="break-all font-mono text-xs">{c.wasmHash}</code>
                  ) : (
                    <span className="text-black/60 dark:text-white/60">WASM hash not published</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
