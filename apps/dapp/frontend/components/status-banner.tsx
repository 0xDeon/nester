"use client";

import { AlertTriangle } from "lucide-react";

import { usePlatformStatus } from "@/hooks/usePlatformStatus";
import { deriveBanner } from "@/lib/platform-status";
import { cn } from "@/lib/utils";

export function StatusBanner() {
  const banner = deriveBanner(usePlatformStatus());
  if (!banner) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-kind={banner.kind}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white",
        banner.severity === "error" ? "bg-red-600" : "bg-amber-500",
      )}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{banner.message}</span>
    </div>
  );
}
