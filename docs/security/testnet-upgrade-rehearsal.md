# Testnet Upgrade Rehearsal Runbook

Procedure for rehearsing a full timelocked vault upgrade on testnet with the
production multi-signer setup before any mainnet upgrade is proposed (issue #1500).

Run this rehearsal at least 48h before every mainnet upgrade proposal.  Record
all transaction hashes in the table at the end of this file.

## Prerequisites

- `stellar` CLI ≥ 21.0 installed and on PATH
- Testnet contracts deployed (run `bash packages/contracts/scripts/deploy-testnet.sh`)
- `VAULT_ID` exported from `packages/contracts/scripts/deployed-testnet.env`
- Three separate signer key aliases configured in `~/.config/stellar/identity/`:
  - `signer-a` — first required multi-sig key
  - `signer-b` — second required multi-sig key
  - `upgrader`  — holds `Role::Upgrader` on the vault

## Step 1 — Build and hash the new WASM

```bash
make build
WASM=packages/contracts/target/wasm32-unknown-unknown/release/vault_contract_opt.wasm
NEW_WASM_HASH=$(stellar contract upload \
  --wasm "$WASM" \
  --source-account upgrader \
  --network testnet 2>&1 | grep -v "^[ℹ🌎✅🔗]" | tail -1)
echo "WASM hash: $NEW_WASM_HASH"
```

Record `$NEW_WASM_HASH`.

## Step 2 — Upload WASM to testnet (if not already on-chain)

The `stellar contract upload` in step 1 uploads the WASM blob and returns its
hash.  If the upload was already done (same build), the command returns the
existing hash without re-uploading.

## Step 3 — Propose the upgrade (requires Role::Upgrader)

The ETA must be at least `MIN_UPGRADE_DELAY_VAULT` (48h = 172 800 s) in the future.

```bash
ETA=$(( $(date +%s) + 172800 ))
PROPOSE_TX=$(stellar contract invoke \
  --id "$VAULT_ID" \
  --source-account upgrader \
  --network testnet \
  -- propose_upgrade \
    --caller $(stellar keys address upgrader) \
    --new_wasm_hash "$NEW_WASM_HASH" \
    --eta "$ETA" 2>&1 | grep "^tx_" | head -1)
echo "propose tx: $PROPOSE_TX"
```

Verify on-chain: the `PROP_UPG` event should appear in the vault's event stream.

## Step 4 — Wait for the timelock to mature

On testnet, advance the ledger past ETA rather than waiting in real-time:

```bash
# Each ledger is ~5 s on testnet; 172 800 s / 5 = 34 560 ledgers.
# There is no direct CLI command to advance ledger time on public testnet —
# instead, wait until the network timestamp exceeds $ETA, or use a local
# Quickstart node for the rehearsal:
#
#   docker run --rm -p 8000:8000 stellar/quickstart --testnet
#   # then set RPC_URL=http://localhost:8000/soroban/rpc
#
# On public testnet, revisit after ~48h.
echo "ETA unix: $ETA  ($(date -d @$ETA 2>/dev/null || date -r $ETA))"
```

## Step 5 — Execute the upgrade (permissionless once ETA reached)

```bash
EXEC_TX=$(stellar contract invoke \
  --id "$VAULT_ID" \
  --source-account signer-a \
  --network testnet \
  -- execute_upgrade \
    --caller $(stellar keys address signer-a) \
    --wasm_hash "$NEW_WASM_HASH" 2>&1 | grep "^tx_" | head -1)
echo "execute tx: $EXEC_TX"
```

## Step 6 — Verify the upgrade

```bash
# Fetch on-chain WASM and confirm sha256 matches $NEW_WASM_HASH
stellar contract fetch --id "$VAULT_ID" --network testnet --out-file /tmp/upgraded.wasm
sha256sum /tmp/upgraded.wasm
```

The hash should match the `NEW_WASM_HASH` from step 1.

Invoke `version()` to confirm the new binary is live:

```bash
stellar contract invoke --id "$VAULT_ID" --source-account signer-a \
  --network testnet -- version
```

## Step 7 — Smoke-test post-upgrade

```bash
# Deposit and withdraw a small amount to confirm the vault is functional.
stellar contract invoke --id "$VAULT_ID" --source-account signer-a \
  --network testnet -- deposit \
    --user $(stellar keys address signer-a) \
    --amount 10000000 \
    --min_shares 0
stellar contract invoke --id "$VAULT_ID" --source-account signer-a \
  --network testnet -- withdraw \
    --user $(stellar keys address signer-a) \
    --shares 10000000 \
    --min_assets 0
```

## Abort / cancel procedure

If a mis-proposed upgrade needs to be cancelled before `execute_upgrade` is called:

```bash
stellar contract invoke \
  --id "$VAULT_ID" \
  --source-account upgrader \
  --network testnet \
  -- cancel_upgrade \
    --caller $(stellar keys address upgrader)
```

The `CAN_UPG` event must appear in the vault's event stream before the rehearsal
is considered clean.

## Rehearsal log

| Date | Rehearsal type | Vault ID | New WASM hash | Propose tx | Execute tx | Pass/Fail |
|---|---|---|---|---|---|---|
| _fill in_ | full | _fill in_ | _fill in_ | _fill in_ | _fill in_ | — |
