# Upgrade Policy

> **Accuracy note (issue #1488):** This document was rewritten against the actual
> contract code with file/line citations. The previous version described a uniform
> timelock-governed upgrade path for all contracts; that is not what the code does.
> Gaps are noted inline.

---

## Upgrade posture by contract

| Contract | Upgrade mechanism | Timelock? | Evidence |
| :--- | :--- | :--- | :--- |
| `vault` | `Upgrade::propose_upgrade` / `execute_upgrade` | Yes — 48 h (`MIN_UPGRADE_DELAY_VAULT`) | `vault/src/lib.rs`, `libs/common/src/upgrade.rs` |
| `treasury` | `Upgrade::propose_upgrade` / `execute_upgrade` | Yes — 7 days (`MIN_UPGRADE_DELAY_TREASURY`) | `treasury/src/lib.rs` |
| `yield_registry` | `Upgrade::propose_upgrade` / `execute_upgrade` | Yes — 48 h (`MIN_UPGRADE_DELAY_YIELD_REGISTRY`) | `yield_registry/src/lib.rs` |
| `allocation_strategy` | `Upgrade::propose_upgrade` / `execute_upgrade` | Yes — 48 h (`MIN_UPGRADE_DELAY_ALLOCATION_STRATEGY`) | `allocation_strategy/src/lib.rs` |
| **`nester`** | **Instant admin `upgrade`** | **No timelock** | `nester/src/lib.rs:172` |
| **`vault_factory`** | **No upgrade function** | **N/A** | `vault_factory/src/lib.rs` (no `upgrade` entry point) |

Delay constants are defined in
`libs/common/src/constants.rs:55-64`.

---

## Timelock path (vault, treasury, registry, allocation_strategy)

These contracts use the shared `nester_common::Upgrade` module
(`libs/common/src/upgrade.rs`):

1. `propose_upgrade(proposer, wasm_hash, min_delay, eta)` — requires
   `Role::Upgrader`; stores a `PendingUpgrade`; rejects `eta < now + min_delay`.
2. `cancel_upgrade(canceller)` — requires `Role::Upgrader`.
3. `execute_upgrade(caller, wasm_hash)` — permissionless after `eta`; wasm hash
   must match the proposal; calls `update_current_contract_wasm`.

Events `PROP_UPG`, `CAN_UPG`, and `EXEC_UPG` are emitted at each step
(see `EVENTS.md`), making the window publicly observable before an upgrade
executes.

---

## `nester` — instant admin upgrade (no timelock)

`nester`'s `upgrade` entry point (`nester/src/lib.rs:172`) requires only
`Role::Admin` and executes the WASM swap immediately — there is no proposal
step, no delay, and no `Role::Upgrader` distinction:

```rust
// nester/src/lib.rs:172-185
pub fn upgrade(env: Env, admin: Address, new_wasm_hash: BytesN<32>) {
    admin.require_auth();
    require_initialized(&env);
    AccessControl::require_role(&env, &admin, Role::Admin);
    // ... increments version counter, emits event, calls update_current_contract_wasm
}
```

Tests confirming Admin-only enforcement are in `nester/src/test.rs:195-215`.

**Gap:** nester does not go through the shared timelock module. This should be
addressed before mainnet if the deployment intent is to give users a withdrawal
window. Tracked in a follow-up issue.

---

## `vault_factory` — no upgrade function

`vault_factory/src/lib.rs` has no `upgrade` entry point and no `Upgrade` usage.
The contract is currently not upgradeable. This may be intentional (factory
logic is minimal) but should be documented as a deliberate decision or the
missing path should be added. Tracked as a follow-up.

---

## Storage safety on upgrade

`update_current_contract_wasm` swaps WASM in-place and never touches contract
storage. Existing deposits, vault token balances, and accrued fees are unaffected
by the upgrade itself. New versions are responsible for their own storage
migrations if the schema changes (`get_schema_version` / `init_schema_version`
in `libs/common/src/upgrade.rs`).

---

## Enforcement

Timelock behaviour is asserted in `vault/src/test.rs`: `Role::Admin` alone
cannot propose an upgrade, a delay below the minimum is rejected, and execution
before the proposal's ETA is rejected regardless of caller.
