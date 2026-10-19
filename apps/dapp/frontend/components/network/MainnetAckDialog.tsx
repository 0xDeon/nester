"use client";

import { useId, useState } from "react";
import { NETWORK_BANNER_COPY } from "@/lib/network-copy";

interface MainnetAckDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function MainnetAckDialog({ onConfirm, onCancel }: MainnetAckDialogProps) {
  const [checked, setChecked] = useState(false);
  const titleId = useId();
  const { links } = NETWORK_BANNER_COPY.mainnet;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-border bg-white dark:bg-[#100F0F] p-6 shadow-xl"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          You are depositing real funds
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>Smart contracts can have bugs. You could lose some or all of your deposit.</li>
          <li>Each vault has a cap. Check the cap and current utilization before depositing.</li>
          <li>Transactions on Stellar are irreversible once submitted.</li>
          <li>Read the audit and risk documents before you continue.</li>
        </ul>
        <p className="mt-3 flex flex-wrap gap-x-4 text-sm">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {link.label}
            </a>
          ))}
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5"
          />
          <span>I understand these risks and that I am using real funds.</span>
        </label>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-border px-5 py-2.5 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!checked}
            className="flex-1 rounded-full bg-[#0a0a0a] px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}
