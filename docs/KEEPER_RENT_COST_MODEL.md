# Keeper & Storage Rent Cost Model — Year One

Companion to [`STORAGE_TTL_STRATEGY.md`](STORAGE_TTL_STRATEGY.md) (what gets
extended and when) and [`docs/security/multisig-signers.md`](security/multisig-signers.md)
(who holds the operator key this account pays from). This document answers a
narrower question: **how much XLM does it cost to keep the protocol alive for
a year, and how much does the keeper account need to hold so it never runs
dry?**

"The keeper" here is the Stellar operator account configured via
`STELLAR_OPERATOR_SECRET` — the same account the rebalancer
(`internal/scheduler`), the harvest engine (`internal/harvest`), and the
signer (`internal/stellar`) submit transactions from. It pays two kinds of
cost:

1. **Storage rent** — `extend_ttl` fees, charged in XLM, for every Soroban
   ledger entry the protocol owns.
2. **Keeper transaction fees** — the base + resource fee on every rebalance
   and harvest transaction the keeper submits.

Deposits, withdrawals, and other user-initiated calls are paid by the calling
user's own account, not the keeper, so they are out of scope here.

---

## 1. Storage rent

### 1.1 Rate and footprint

Figures carried over from [`STORAGE_TTL_STRATEGY.md §4`](STORAGE_TTL_STRATEGY.md#4-rent-cost--budget-modeling):

| Entry | Storage type | Size | Scales with |
|---|---|---|---|
| Vault instance state (`DataKey::Token`, `TotalAssets`, `AccruedFees`, `CircuitBreaker`, `ExitFeeTiers`) | `Instance` | ~1.2 KB per vault contract | number of vault contracts, **not** users |
| Per-user position (`UserPrincipal`, `UserShares`, `Tenure`) | `Persistent` | ~160 bytes per user per vault | number of users |

Base rate: ~0.000005 XLM per KB per 10,000 ledgers (~13.9 hours). Scaled to a
30-day extension window (`TTL_EXTEND_TO_LEDGERS` = 518,400 ledgers ≈ 30 days),
that is ~0.00026 XLM per KB per extension.

### 1.2 Annual rent by user count

Assumes one extension per entry per 30-day window (the steady-state rate once
`extend_ttl` is called at the `TTL_BUMP_THRESHOLD_LEDGERS` watermark), and a
fixed 2-vault deployment (USDC vault + XLM vault, matching
`deployed-testnet.env`) for the instance-level row:

| Users | Per-user rent / month | Per-user rent / year | Instance rent / year (2 vaults) | **Total rent / year** |
|---|---|---|---|---|
| 1,000 | 0.08 XLM | 0.96 XLM | 0.0014 XLM | **~0.96 XLM** |
| 10,000 | 0.8 XLM | 9.6 XLM | 0.0014 XLM | **~9.6 XLM** |
| 100,000 | 8 XLM | 96 XLM | 0.0014 XLM | **~96 XLM** |

Instance-level rent is negligible at any of these scales — rent cost is
dominated entirely by per-user persistent entries, and it scales linearly
with users, not with transaction volume.

### 1.3 How to re-derive this against current network settings

The 0.000005 XLM/KB/10k-ledgers rate is a point-in-time approximation. Before
funding a mainnet keeper account, re-measure it directly instead of trusting
this document indefinitely:

```bash
# Current network-wide rent fee configuration
stellar contract fetch --network mainnet --id <any-contract-id> >/dev/null  # sanity: RPC reachable
curl -s "$STELLAR_SOROBAN_RPC_URL" -X POST -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getNetwork","params":{}}' | jq '.result'

# Simulate a real extend_ttl call against a deployed vault and read the
# resource fee Soroban actually quotes, rather than the approximation above
stellar contract invoke --network mainnet --id <VAULT_CONTRACT_ID> --sim-only \
  -- extend_ttl --threshold 120960 --extend_to 518400
```

The simulation's `minResourceFee` (same field `internal/stellar/invoker.go`
already parses for every other contract call) is the authoritative per-call
number. Multiply by the number of persistent entries a vault actually holds
to refresh §1.2.

---

## 2. Keeper transaction fees

The keeper submits two recurring transaction types, both independent of user
count:

| Job | Cadence (config) | Submits a tx when |
|---|---|---|
| Rebalancer (`internal/scheduler`) | `REBALANCER_INTERVAL_MINUTES` = 15 min | APY gain exceeds `REBALANCER_MIN_APY_GAIN_BPS` (default 50 bps) — not every tick |
| Harvest engine (`internal/harvest`) | `HARVEST_ENGINE_INTERVAL` = 1 hour | Accrued yield exceeds `GasFee + Margin` (defaults 0.05 + 0.10) — not every tick |

Both are gated by profitability checks, so actual submission frequency is far
below the tick rate. Modeling the **worst case** (every tick submits) gives a
safe upper bound per vault:

| Job | Worst-case txs/day/vault | Assumed fee/tx | Worst-case cost/day/vault |
|---|---|---|---|
| Rebalancer | 96 | ~0.00001 XLM base + Soroban resource fee (re-measure per §1.3; budget 0.01 XLM/tx pending real figures) | ~0.96 XLM |
| Harvest | 24 | same budget, 0.01 XLM/tx | ~0.24 XLM |

At 2 vaults, worst case is **~2.4 XLM/day ≈ 876 XLM/year**. In practice,
observed rebalance/harvest frequency is far lower than per-tick, because both
are profitability-gated — treat 876 XLM/year as a conservative ceiling, not
an expected spend, and replace the 0.01 XLM/tx placeholder with the real
`minResourceFee` from §1.3 once measured.

This is the dominant cost, and it **does not scale with user count** — it
scales with vault count and market volatility (how often a rebalance actually
clears the APY-gain threshold).

---

## 3. Year-one funding recommendation

| Component | 1k users | 10k users | 100k users |
|---|---|---|---|
| Storage rent (§1.2) | ~1 XLM | ~10 XLM | ~96 XLM |
| Keeper tx fees, worst case (§2) | ~876 XLM | ~876 XLM | ~876 XLM |
| **12-month total** | **~877 XLM** | **~886 XLM** | **~972 XLM** |
| Margin (50%, covers fee spikes and placeholder-rate error) | ~439 XLM | ~443 XLM | ~486 XLM |
| **Recommended keeper funding** | **~1,316 XLM** | **~1,329 XLM** | **~1,458 XLM** |

A flat 50% margin is used because §2's per-tx fee is still a placeholder
pending the §1.3 measurement — once real `minResourceFee` values are in,
tighten the margin to the standard 20–30% range used elsewhere in the
protocol's cost modeling (`internal/costmonitor`).

**Action before mainnet funding:** run §1.3's simulation against the deployed
mainnet vaults, update the 0.01 XLM/tx placeholder, and recompute this table.
Treat the numbers above as a funding ceiling to size the initial transfer,
not a figure to cite externally.

---

## 4. Balance-runway alert

The low-reserve alert already in
[`monitoring/alerts/stellar_reserve.yml`](../monitoring/alerts/stellar_reserve.yml)
(`StellarOperationalAccountLowReserve`) fires only once the account is
already at the floor. It gives no advance warning. The rule below adds a
predictive alert on the same `nester_stellar_account_balance_xlm` series
(populated every minute by `internal/stellar`'s `AccountReserveSampler`,
registered in `cmd/api/main.go` under `account_name="operator"`): it
extrapolates the balance's trailing 7-day trend forward and pages when that
trend crosses zero within 30 days.

```yaml
- alert: StellarOperationalAccountRunwayLow
  expr: |
    predict_linear(nester_stellar_account_balance_xlm[7d], 30 * 24 * 3600) < 0
    and
    nester_stellar_account_balance_xlm > 0
  for: 1h
  labels:
    severity: warning
    network: mainnet
  annotations:
    summary: "Keeper account balance is on track to run out within 30 days"
    description: "{{ $labels.account_name }} account is projected to hit zero XLM within 30 days at its current burn rate (current balance {{ $value }}). Top up before StellarOperationalAccountLowReserve fires."
```

Added as `StellarOperationalAccountRunwayLow` in
`monitoring/alerts/stellar_reserve.yml` alongside the existing low-reserve
rule. The `and nester_stellar_account_balance_xlm > 0` guard keeps a
zero/missing series (e.g. monitoring down, or the account already drained)
from evaluating `predict_linear` on a flat line and firing spuriously — the
existing critical alert already owns that case.

`for: 1h` on a 7-day window absorbs a single noisy top-up or a one-off
expensive rebalance burst without flapping; it does not blunt a genuine
multi-day depletion trend, which is what 30 days of warning is for.
