"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  MAX_SLIPPAGE_BPS,
  formatSlippagePercent,
  parseSlippagePercent,
} from "@/lib/slippage";

const PRESETS_BPS = [10, 50, 100];

export function SlippageControl({
  bps,
  onChange,
  disabled,
}: {
  bps: number;
  onChange: (bps: number) => void;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState("");
  const [invalid, setInvalid] = useState(false);

  const handleCustom = (value: string) => {
    setCustom(value);
    if (value === "") {
      setInvalid(false);
      return;
    }
    const parsed = parseSlippagePercent(value);
    setInvalid(parsed === null);
    if (parsed !== null) onChange(parsed);
  };

  return (
    <div className="mt-4" data-testid="slippage-control">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Slippage tolerance
        </label>
        <span className="text-xs text-muted-foreground">
          Max {formatSlippagePercent(MAX_SLIPPAGE_BPS)}%
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {PRESETS_BPS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => {
              setCustom("");
              setInvalid(false);
              onChange(preset);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40",
              bps === preset && custom === ""
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground/70 hover:text-foreground"
            )}
          >
            {formatSlippagePercent(preset)}%
          </button>
        ))}
        <div
          className={cn(
            "flex items-center rounded-full border px-3 py-1.5 text-xs",
            invalid ? "border-destructive" : "border-border"
          )}
        >
          <input
            type="text"
            inputMode="decimal"
            aria-label="Custom slippage tolerance percent"
            aria-invalid={invalid}
            placeholder="Custom"
            value={custom}
            disabled={disabled}
            onChange={(event) => handleCustom(event.target.value)}
            className="w-14 bg-transparent outline-none placeholder:text-muted-foreground/60"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </div>
      {invalid && (
        <p className="mt-1.5 text-xs text-destructive" role="alert">
          Enter a value between 0 and {formatSlippagePercent(MAX_SLIPPAGE_BPS)}%.
        </p>
      )}
    </div>
  );
}
