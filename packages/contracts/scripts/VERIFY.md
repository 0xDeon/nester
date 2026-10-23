# Verifying a deployed testnet contract

## Reproducibility prerequisite (issue #1493)

Contract builds are reproducible only when the exact toolchain in
`packages/contracts/rust-toolchain.toml` is used.  Install it with:

```bash
cd packages/contracts
rustup show   # prints active toolchain — must match rust-toolchain.toml
```

If the active toolchain doesn't match, run:

```bash
rustup toolchain install   # reads rust-toolchain.toml automatically
```

Two independent clean builds (`cargo clean && make build`) on any machine with
the same pinned toolchain must produce bit-identical `*_opt.wasm` files.
Verify:

```bash
# Machine A
sha256sum target/wasm32-unknown-unknown/release/vault_contract_opt.wasm > sha256.txt

# Machine B (same commit, same rust-toolchain.toml)
sha256sum target/wasm32-unknown-unknown/release/vault_contract_opt.wasm
# Output must match sha256.txt
```

`deploy-testnet.sh` records, at the top of `deployed-testnet.env`, the git
commit and the wasm sha256 of each optimized `.wasm` it deployed. Use those
to verify a deployed contract still matches source.

## Verify a contract's on-chain wasm matches this commit

1. Check out the recorded commit:
   ```bash
   git checkout <commit-from-deployed-testnet.env>
   ```
2. Rebuild the same way the deploy script did:
   ```bash
   make build
   ```
3. Hash the rebuilt wasm and compare to the recorded value:
   ```bash
   sha256sum target/wasm32-unknown-unknown/release/nester_contract_opt.wasm
   ```
4. Compare against the on-chain wasm hash for the deployed contract ID:
   ```bash
   stellar contract fetch --id <CONTRACT_ID> --network testnet --out-file /tmp/onchain.wasm
   sha256sum /tmp/onchain.wasm
   ```
   The two sha256 values (rebuilt-from-source vs. fetched-from-chain) must match.

## Redeploying

Redeploying via `deploy-testnet.sh` deploys **new** contract instances with
new contract IDs — it does not upgrade the existing ones in place. Existing
deployed contracts and their on-chain state are untouched; only
`deployed-testnet.env` is overwritten with the new IDs, so anything still
pointing at the old IDs (a running frontend, an indexer, a user's saved
contract reference) keeps working against the old deployment until it's
manually updated to the new one.

To upgrade an *existing* deployed contract in place instead of deploying a
new one, use the `propose_upgrade`/`execute_upgrade` flow printed at the end
of `deploy-testnet.sh`'s output, not a redeploy.

## Verifying a deployed **mainnet** contract

This is the procedure an auditor or user outside the team follows to confirm
a mainnet contract is running the exact code the audit covered — not merely
*some* code that happens to compile. It assumes no trust in this repository's
maintainers: every value is either recomputed from source or read directly
from the chain.

### Prerequisites

Same reproducibility prerequisite as testnet (§ above): install the exact
toolchain in `rust-toolchain.toml`, and confirm with `rustup show` before
building anything.

### Step 1 — Get the claimed values

Read `packages/contracts/scripts/deployed-mainnet.env`. Its header comment
records, for this deployment:

- the **audited commit SHA** — the exact commit the published audit report
  (linked from `docs/security/`) covers;
- the **wasm sha256** of each optimized contract build;
- the **deploy transaction hash** for each contract.

Do not trust these values yet — steps 2–4 independently reproduce them.

### Step 2 — Rebuild from the audited commit

```bash
git clone https://github.com/<org>/nester
cd nester
git checkout <AUDITED_COMMIT_SHA from deployed-mainnet.env>
rustup show   # must print the toolchain pinned in rust-toolchain.toml
cd packages/contracts
make build
for wasm in vault_token vault_contract treasury_contract yield_registry_contract allocation_strategy_contract nester_contract; do
  stellar contract optimize \
    --wasm target/wasm32-unknown-unknown/release/${wasm}.wasm \
    --wasm-out target/wasm32-unknown-unknown/release/${wasm}_opt.wasm
done
sha256sum target/wasm32-unknown-unknown/release/*_opt.wasm
```

Compare each hash against the matching line in `deployed-mainnet.env`'s
header. A mismatch here means the deployed contract does **not** match the
audited source — stop and escalate rather than continuing to step 3.

### Step 3 — Compare against the on-chain WASM

Rebuilding from source only proves what *should* have been deployed. Confirm
the chain is actually running it:

```bash
stellar contract fetch --id <CONTRACT_ID> --network mainnet --out-file /tmp/onchain_<name>.wasm
sha256sum /tmp/onchain_<name>.wasm
```

This hash must equal both the step-2 rebuild hash and the recorded value in
`deployed-mainnet.env`, for every contract ID listed there.

### Step 4 — Confirm the deploy transaction itself

The WASM hash alone proves *a* contract with that code exists; the recorded
deploy transaction hash proves *this specific contract ID* was created by
*this specific, attributable transaction* — closing the gap between "code I
can verify" and "code I can verify was deployed the way the team says it
was":

```bash
curl -s "https://horizon.stellar.org/transactions/<DEPLOY_TX_HASH>" | jq '.successful, .source_account'
curl -s "https://horizon.stellar.org/transactions/<DEPLOY_TX_HASH>/operations" | jq '._embedded.records[] | {type, function}'
```

Confirm: the transaction succeeded (`successful: true`), its source account
is the documented deployer/admin address (`NEXT_PUBLIC_ADMIN_ADDRESS` in
`deployed-mainnet.env`), and it contains an `invoke_host_function` operation
whose `create_contract` result is the contract ID you are verifying. Any
Stellar block explorer (e.g. stellar.expert) showing the same facts is an
acceptable substitute for raw Horizon queries.

### What "verified" means here

All four of: rebuild hash (step 2) == on-chain hash (step 3) == recorded
hash (step 1), **and** the deploy transaction (step 4) independently
confirms that contract ID was created by the documented deployer. Any one
of these failing means do not trust the deployment — report it rather than
assuming a tooling difference.
