# Cross-Contract Call Target Table

> **Issue #1489** — Every `invoke_contract` / `try_invoke_contract` call in the
> deployable contracts is listed here with the address source, who can change it,
> and whether it is ever caller-supplied at call time.

---

## How to read this table

| Column | Meaning |
| :--- | :--- |
| **Caller contract** | The contract that issues the cross-contract call |
| **Target address source** | Where the called address comes from |
| **Who sets it** | Role or mechanism that writes the address into storage |
| **Caller-supplied?** | `No` = address is from contract storage; `Yes*` = address was originally supplied by an end-user (see note) |
| **Methods called** | Function names invoked on the target |
| **Evidence** | File and approximate line |

---

## Call table

| # | Caller contract | Target address source | Who sets it | Caller-supplied? | Methods called | Evidence |
|---|:---|:---|:---|:---:|:---|:---|
| 1 | `vault` | `DataKey::YieldRegistry` (instance storage) | Admin at `initialize` / `set_yield_registry` | No | `get_source_status`, `get_source_adapter` | `vault/src/lib.rs:788-808` |
| 2 | `vault` | Adapter address returned by `get_source_adapter` (yield_registry) | Admin via yield_registry `register_source` | No† | `deposit`, `withdraw`, `position_value`, `max_withdraw` | `vault/src/lib.rs:847-979` |
| 3 | `vault` | `DataKey::Token` (underlying SEP-41 token) | Admin at `initialize` | No | SEP-41 `transfer`, `authorize` | `vault/src/lib.rs:831-833` |
| 4 | `vault` | `DataKey::AllocationStrategy` | Admin | No | `rebalance` | `vault/src/lib.rs:1358` |
| 5 | `allocation_strategy` | `DataKey::RegistryId` (instance storage) | Admin at `initialize` | No | `has_source`, `get_source_status`, `get_active_sources` | `allocation_strategy/src/lib.rs:1181-1211` |
| 6 | `allocation_strategy` | Adapter address from registry `get_active_sources` | Admin via yield_registry | No† | `deposit`, `withdraw`, `position_value` | `allocation_strategy/src/lib.rs:64` |
| 7 | `yield_registry` | `source.adapter` field stored by admin | Admin via `register_source` / `update_source` | No | `current_apy` | `yield_registry/src/lib.rs:520` |
| 8 | `adapter_lending` | `DataKey::Protocol` (lending pool) | Vault at `initialize` | No | `supply`, `withdraw`, `get_position` | `adapter_lending/src/lib.rs:94,134,185,198,221` |
| 9 | `adapter_blend` | `DataKey::Pool` (Blend Capital pool) | Vault at `initialize` | No | `submit` (Blend request format) | `adapter_blend/src/lib.rs:121` |
| 10 | `adapter_pool` | `DataKey::Pool` | Vault at `initialize` | No | `deposit`, `withdraw`, `get_reserves`, `total_shares` | `adapter_pool/src/lib.rs:120,164,297-298` |
| 11 | `adapter_soroswap` | `DataKey::Router` | Vault at `initialize` | No | `swap_exact_tokens_for_tokens`, `add_liquidity`, `remove_liquidity` | `adapter_soroswap/src/lib.rs:128,269,319` |
| 12 | `adapter_soroswap` | `DataKey::Pair` | Vault at `initialize` | No | `total_supply`, `get_reserves`, `token_0` | `adapter_soroswap/src/lib.rs:217,223,225` |
| 13 | `vault_factory` | `env.deployer()` — address derived from factory address + salt | Deterministic (factory + salt) | No‡ | `initialize` (on newly deployed vault) | `vault_factory/src/lib.rs:158-165` |
| 14 | `savings_goal` | `DataKey::VaultFactory` | Admin at `initialize` | No | `is_nester_vault` | `savings_goal/src/lib.rs:615` |
| 15 | `goal_rewards` | `DataKey::GoalRegistry` (`savings_goal` contract) | Admin at `initialize` | No | `get_goal`, `get_contribution_stats` | `goal_rewards/src/lib.rs:436-473` |
| 16 | `goal_rewards` | `goal.vault` field from `savings_goal` registry | Originally user-supplied at `create_goal`; validated by `is_nester_vault` before storage | Yes* | `get_balance` (read-only) | `goal_rewards/src/lib.rs:777` |
| 17 | `lp_aggregator` | `POOLS` storage (list of admin-registered pools) | Admin via `register_pool` | No | `get_reserves`, `swap` | `lp_aggregator/src/lib.rs:72,117` |

---

## Caller-supplied address analysis

### Entry 16 — `goal_rewards` calling `goal.vault` (`get_balance`)

`goal.vault` was provided by an end-user in `savings_goal::create_goal`. However, `create_goal` guards against arbitrary addresses by calling `is_nester_vault` (a cross-call to `vault_factory`) before writing the goal into storage (`savings_goal/src/lib.rs:238-240`). Only addresses that pass the factory's registry check are stored.

The downstream call in `goal_rewards` (`read_vault_balance`) uses `try_invoke_contract` and returns 0 on any failure — it never panics and cannot be used to extract funds. A spoofed address that somehow passed the factory check could return an inflated balance figure, which is why `savings_goal`'s `is_nester_vault` gate is load-bearing.

**Risk**: Low, but the gate (`is_nester_vault`) must remain tamper-proof. Any path that allows writing a non-factory vault address into `Goal.vault` storage bypasses the only safety control.

### Entry 2 / Entry 6 — adapter addresses from registry

The adapter address is stored in `yield_registry` by an admin role. It is not directly caller-supplied at invocation time. The vault additionally gates every adapter call through `CalleeAllowlist::is_registered` (`vault/src/lib.rs:817`), so even if a registry admin mis-registered an address, the allowlist provides a second check.

### Entries 13 — `vault_factory` `init_args`

The `create_vault` call passes a caller-supplied `init_args: Vec<Val>` to the freshly deployed vault's `initialize` function. The WASM being initialized was deployed from the factory's own `VaultWasmHash` (admin-controlled), so the callee is not attacker-controlled. The `init_args` affect the vault's configuration (admin, underlying token, etc.) but are validated by the vault's own `initialize` guard.

---

## Summary

No call target is unsafely caller-supplied at invocation time. Entry 16 (`goal_rewards → goal.vault`) is the only case where an address originated from user input, but it is validated by `savings_goal` before storage and is called read-only via `try_invoke_contract`. All other targets come exclusively from admin-controlled storage set at contract initialization.
