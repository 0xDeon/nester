# Predictive protocol-health deterioration monitoring

`ProtocolHealthChecker` (`internal/scheduler/protocol_health_checker.go`) has
always run a fixed rule: alert when a protocol's TVL drops more than 20% in
24 hours. That reacts to a collapse already underway. The deterioration
engine (`internal/scheduler/deterioration_*.go`) adds prediction: a
continuous, graduated score computed from leading indicators, independent of
and running alongside the fixed 24h/20% check.

## Indicators

Computed in `ComputeIndicators` (`deterioration_indicators.go`) from data
already ingested — DeFiLlama TVL/APY snapshots (`protocoltvl`, `apysnapshot`)
— no new external data source required:

- **TVL outflow velocity** — percentage decline from the first to the last
  snapshot in the window.
- **APY abnormality** — z-score of the latest APY reading against the
  window's own mean/stddev. A large absolute z-score in either direction
  (spike or collapse) is abnormal.
- **Reported-vs-derived APY gap** — the latest reading compared against a
  short trailing baseline of the same series. This is a proxy: a true
  on-chain-derived accrual figure requires an oracle-aggregation layer that
  has not landed as a separate piece of work. Widening divergence from a
  protocol's own recent trend is the real, computable signal this stands in
  for.
- **Price instability** — coefficient of variation (stddev/mean) of the TVL
  series, standing in for underlying/LP token price instability where a
  direct per-protocol price feed isn't available.

Each indicator is independently interpretable — this is what makes an alert
explainable rather than an opaque number.

## Scoring

`Score` (`deterioration_score.go`) is a deliberately simple, fully
transparent weighted-logistic model: each indicator is normalized to
roughly [0,1], weighted, summed, and passed through a logistic squash to
produce a probability. Every weight is a named constant; nothing is opaque.
TVL outflow carries the heaviest weight (the issue's own framing: "smart
money leaving early" is the strongest tell), APY abnormality and the
reported/derived gap are strong corroborating signals, and price instability
is a weaker, noisier one.

Thresholds (`ThresholdMild` / `ThresholdModerate` / `ThresholdSevere`) are
calibrated so a single strong indicator alone lands at most in "moderate";
reaching "severe" — which can trigger automatic capital movement — requires
multiple corroborating signals. A thin sample (fewer than
`minSampleCountForConfidence` data points) is capped below "severe"
regardless of what it scores, so a noisy one-off reading can never alone
justify moving funds.

## Graduated action

`DeteriorationEngine.DispatchAction` (`deterioration_action.go`) maps level
to action:

| Level | Action |
|---|---|
| none | nothing |
| mild | ceiling-cut recorded (informational) |
| moderate | rebalance recommendation recorded + logged for operators |
| severe | automatic protective rebalance for every vault allocated to the protocol, via the existing slippage-safe `AdminService.TriggerRebalance` |

Every action — including a failed automatic-rebalance attempt — is written
to `deterioration_actions` before/alongside any notification. Nothing here
moves funds through any path other than the existing, audited rebalance
mechanism.

## Calibration review

Every assessment (not just ones that cross a threshold) is recorded to
`deterioration_assessments`, so a probability can later be checked against
what actually happened to the protocol — the calibration-validation loop the
issue asks for.

## Sudden TVL-drop anomaly detection

Separate from the 24h/20% alert and from the scored indicators above,
`protocoltvl.DetectAnomaly` flags a protocol whose TVL falls by more than a
configurable percentage between two **consecutive snapshots** — the signature
of an exploit or a bug rather than gradual outflow.

- Each tick, `ProtocolHealthChecker` reads the previous snapshot, inserts the
  new one, and compares them. The threshold is `PROTOCOL_TVL_ANOMALY_DROP_PCT`
  (default `10`, valid range `(0, 100]`).
- A prior snapshot older than `protocoltvl.AnomalyMaxSnapshotAge` (2h) is
  ignored, so a scheduler outage does not make an ordinary decline look sudden.
- A detected anomaly is logged at error level and passed to
  `DeteriorationEngine.HandleTVLAnomaly`, which records a **moderate**
  assessment and a `recommend_rebalance` action and alerts operators.
- It deliberately never triggers an automatic rebalance by itself: a single
  reading can be a bad data point, so moving funds stays with the scored,
  multi-indicator severe path or an operator decision.

## Pause modes: what still works

The launch plan is "pause deposits, keep withdrawals open". That only holds if
no withdraw path shares a guard with deposits, so each way the system can stop
is pinned by a test that asserts which operations still succeed. A pause that
traps users in exactly the incident they want out of is a defect, not a safety
control.

### On-chain (vault contract)

Test: `pause_mode_matrix_matches_the_documented_table` in
`packages/contracts/contracts/vault/src/test.rs` (module `pause_matrix`). The
property `prop_withdrawals_stay_open_while_only_deposits_are_halted` covers the
deposit-only row across position sizes and withdrawn fractions.

✓ = succeeds, ✗ = rejected.

| Mode (how it is entered) | `deposit` | `withdraw` | `emergency_withdraw` | `harvest` | `unlock_position` |
| --- | --- | --- | --- | --- | --- |
| Normal (control) | ✓ | ✓ | ✗ | ✓ | ✓ |
| Deposit-only breaker (`guardian_halt_deposits`, severity `DepositsHalted`) | ✗ | ✓ | ✗ | ✓ | ✓ |
| Per-vault pause (`pause`) | ✗ | ✗ | ✓ | ✗ | ✓ |
| Full-halt breaker (`guardian_trip_breaker`, severity `FullHalt`) | ✗ | ✗ | ✓ | ✗ | ✓ |

Reading the table:

- **Deposit-only breaker** is the mode to use when new money should stop but
  users must be able to leave. `withdraw` is guarded by
  `breaker::require_withdrawals_allowed` (blocks only at `FullHalt`), not by
  `breaker::require_deposits_allowed`, and the vault status stays `Active`.
- **Per-vault pause and full halt** close the normal `withdraw` path on
  purpose, and open `emergency_withdraw` as the exit. Anyone who needs to
  leave in these modes uses it.
- **`emergency_withdraw` is paused-only.** It is rejected in the first two rows
  because the normal `withdraw` is still open there.
- **`unlock_position` is never blocked.** It only moves already-owned shares
  from a matured lock to the flexible balance and moves no assets.

If a row changes, update the `MATRIX` constant and the table comment in the
test module together with this table.

### Off-chain (API global money-path switch)

The global switch (`deposits_paused`, `withdrawals_paused`) gates the API's
deposit and withdrawal paths and is independent per flag. Test:
`TestGlobalPauseMatrix` in `apps/api/internal/service/vault_money_path_pause_test.go`.
It does not gate the contract calls a user signs directly, so
`harvest` and `unlock_position` are not affected by it.

| Switch engaged | API deposit | API withdrawal | API rebalance | API emergency withdraw |
| --- | --- | --- | --- | --- |
| `deposits_paused` only | ✗ | ✓ | ✓ | ✓ |
| `withdrawals_paused` only | ✓ | ✗ | ✗ | ✓ |
