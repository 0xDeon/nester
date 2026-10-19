# Issuer Action Runbook

Covers protocol response when Circle exercises issuer-level controls on USDC
(freeze or clawback) against a Nester vault address or an adapter address.

## Issuer action types

| Action | Stellar SAC call | Effect on vault |
|---|---|---|
| **Freeze** | `set_authorized(vault_id, false)` | Vault cannot send or receive USDC. Deposits and withdrawals fail. |
| **Clawback** | `clawback(vault_id, amount)` | Vault USDC balance reduced. `total_assets` accounting is now stale (higher than real balance). |

## Detection

Monitor the on-chain USDC SAC for `AuthorizedEvent` and `ClawbackEvent` emitted
for the vault and adapter addresses.  Horizon event stream:

```
GET /accounts/{VAULT_ID}/operations?limit=200&order=desc
```

Alert if `type = "set_options"` (`auth_required_flag`, `auth_revocable_flag`
changes) or `type = "clawback"` appears for the vault address.

## Freeze response

1. **Confirm** the freeze: `stellar contract invoke --id $USDC_CONTRACT -- authorized --id $VAULT_ID`
2. **Pause deposits** immediately:
   ```bash
   stellar contract invoke --id $VAULT_ID -- pause --caller $ADMIN
   ```
3. **Do not attempt withdrawals** while frozen — they will revert.
4. **Contact Circle** via https://www.circle.com/en/legal/trust-center with
   the vault contract ID, transaction hash of the freeze operation, and
   Nester's legal entity name.
5. Once Circle confirms the freeze is lifted, **verify** and **unpause**:
   ```bash
   stellar contract invoke --id $VAULT_ID -- is_paused  # should return false after unpause
   stellar contract invoke --id $VAULT_ID -- unpause --caller $ADMIN
   ```

## Clawback response

1. **Confirm** the clawback amount from the `clawback` operation's `amount` field.
2. **Report impairment** to reconcile `total_assets` with the real balance:
   ```bash
   stellar contract invoke --id $VAULT_ID -- report_yield --caller $MANAGER --amount -<CLAWBACK_AMOUNT>
   ```
   This marks the loss, prevents performance fee accrual on the impaired
   amount, and allows pro-rata withdrawals to continue.
3. **Pause new deposits** to prevent new users from entering a partially
   impaired pool before the incident is resolved:
   ```bash
   stellar contract invoke --id $VAULT_ID -- pause --caller $ADMIN
   ```
4. **Verify share price** post-reconciliation:
   ```bash
   stellar contract invoke --id $VAULT_TOKEN_ID -- share_price
   ```
   Expect share price ≤ pre-clawback value.
5. **User communication**: notify depositors of the impairment and pro-rata
   recovery fraction.  No user is preferred over another; withdrawals process
   at the post-clawback share price for everyone.
6. **Unpause** once Circle confirms the situation is resolved and no further
   clawback is expected:
   ```bash
   stellar contract invoke --id $VAULT_ID -- unpause --caller $ADMIN
   ```

## Adapter clawback (partial vault assets)

If an adapter's balance is clawed back (Circle freezes the adapter contract's
USDC sub-account), the yield registry source for that adapter should be set to
`Deprecated` before reconciling `total_assets`:

```bash
stellar contract invoke --id $YIELD_REGISTRY_ID -- update_source_status \
  --caller $ADMIN --source_key <KEY> --status Deprecated
stellar contract invoke --id $VAULT_ID -- report_yield \
  --caller $MANAGER --amount -<ADAPTER_CLAWBACK_AMOUNT>
```

## Post-incident

- Record the tx hash of the clawback/freeze operation and the reconciliation
  `report_yield` in `docs/security/incident-response.md`.
- Update `VAULT_WASM_SHA256` in `scripts/deployed-testnet.env` if any
  emergency upgrade was performed.
- File an incident report within 48 hours.
