# Mainnet Audit Scope

The audit scope is exactly the contracts listed in
[`packages/contracts/launch-manifest.toml`](../../packages/contracts/launch-manifest.toml).
That manifest is the single list of what ships on mainnet, with the audited
commit recorded per contract.

## How the manifest is enforced

| Consumer | Behaviour |
| --- | --- |
| `packages/contracts/scripts/deploy-mainnet.sh <package>` | Refuses any package that is not listed, or is listed without an `audited_commit`. |
| `python3 scripts/launch_manifest.py size-gate <wasm_dir>` (`make size-gate`) | Fails if a listed WASM is missing or exceeds its `max_wasm_bytes`. |
| This document / the audit package | Scope is the manifest. Adding a contract to the audit means adding it to the manifest. |

## Out of scope (cannot be deployed with the mainnet script)

`lp_aggregator` (stub swaps), `referral`, `savings_goal`, `recurring_deposit`,
`adapter_lending`, `adapter_pool`, and `rent_escrow` (placeholder). To ship one
of these, add it to the manifest and include it in the next audit.

## Updating the audited commit

Once auditors sign off on a contract, set its `audited_commit` in the manifest to
the reviewed commit SHA. A contract with an empty `audited_commit` is not cleared
for deployment.
