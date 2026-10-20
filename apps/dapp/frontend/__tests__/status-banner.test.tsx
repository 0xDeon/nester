import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { deriveBanner, INDEXER_LAG_THRESHOLD_LEDGERS, type PlatformStatus } from "@/lib/platform-status";
import { StatusBanner } from "@/components/status-banner";

const statusMock = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/hooks/usePlatformStatus", () => ({
  usePlatformStatus: () => statusMock.value,
}));

const healthy: PlatformStatus = {
  deposits_paused: false,
  withdrawals_paused: false,
  indexer_lag_ledgers: 2,
  rpc_healthy: true,
};

describe("deriveBanner", () => {
  it("returns null when everything is healthy", () => {
    expect(deriveBanner(healthy)).toBeNull();
  });

  it("returns null when status is unknown", () => {
    expect(deriveBanner(null)).toBeNull();
  });

  it("deposits paused, withdrawals available", () => {
    const b = deriveBanner({ ...healthy, deposits_paused: true });
    expect(b).toMatchObject({ kind: "deposits_paused", severity: "error" });
    expect(b?.message).toBe("Deposits are paused. Withdrawals remain available.");
  });

  it("withdrawals paused, deposits available", () => {
    const b = deriveBanner({ ...healthy, withdrawals_paused: true });
    expect(b).toMatchObject({ kind: "withdrawals_paused", severity: "error" });
    expect(b?.message).toBe("Withdrawals are paused. Deposits remain available.");
  });

  it("both paused", () => {
    const b = deriveBanner({ ...healthy, deposits_paused: true, withdrawals_paused: true });
    expect(b?.kind).toBe("all_paused");
    expect(b?.message).toBe("Deposits and withdrawals are temporarily paused.");
  });

  it("rpc outage", () => {
    const b = deriveBanner({ ...healthy, rpc_healthy: false });
    expect(b).toMatchObject({ kind: "rpc_down", severity: "error" });
    expect(b?.message).toMatch(/transactions may fail/i);
  });

  it("indexer lag over the threshold", () => {
    const b = deriveBanner({ ...healthy, indexer_lag_ledgers: INDEXER_LAG_THRESHOLD_LEDGERS + 1 });
    expect(b).toMatchObject({ kind: "indexer_lag", severity: "warning" });
    expect(b?.message).toBe("Balances may be delayed while we catch up with the network.");
  });

  it("does not warn at exactly the threshold or when lag is unknown", () => {
    expect(deriveBanner({ ...healthy, indexer_lag_ledgers: INDEXER_LAG_THRESHOLD_LEDGERS })).toBeNull();
    expect(deriveBanner({ ...healthy, indexer_lag_ledgers: null })).toBeNull();
  });

  it("prioritises pause over rpc outage over lag", () => {
    const all = { ...healthy, rpc_healthy: false, indexer_lag_ledgers: 9999, deposits_paused: true };
    expect(deriveBanner(all)?.kind).toBe("deposits_paused");
    expect(deriveBanner({ ...all, deposits_paused: false })?.kind).toBe("rpc_down");
  });
});

describe("StatusBanner", () => {
  it("renders nothing when healthy", () => {
    statusMock.value = healthy;
    const { container } = render(<StatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while status is unavailable", () => {
    statusMock.value = null;
    const { container } = render(<StatusBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the paused banner", () => {
    statusMock.value = { ...healthy, deposits_paused: true };
    render(<StatusBanner />);
    expect(screen.getByRole("status")).toHaveTextContent("Deposits are paused. Withdrawals remain available.");
  });

  it("renders the rpc outage banner", () => {
    statusMock.value = { ...healthy, rpc_healthy: false };
    render(<StatusBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/transactions may fail/i);
  });

  it("renders the delayed balances banner", () => {
    statusMock.value = { ...healthy, indexer_lag_ledgers: 500 };
    render(<StatusBanner />);
    expect(screen.getByRole("status")).toHaveTextContent("Balances may be delayed");
  });
});
