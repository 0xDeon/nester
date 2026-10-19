# Mainnet Risk Disclosures

Depositing on Nester mainnet uses real funds. Read this before your first deposit.

## Smart contract risk

Nester vaults are Soroban smart contracts. Contracts can contain bugs that are
not found by testing or audits, and a defect could lead to partial or total loss
of deposited funds. Only the contracts listed in
[`packages/contracts/launch-manifest.toml`](../../packages/contracts/launch-manifest.toml)
are in the audit scope; see [Audit Scope](audit-scope.md).

## Vault caps

Each vault has a deposit cap. The cap and current utilization are shown on the
vault page. A deposit that would exceed the cap is rejected. Check both before
depositing; a vault near its cap may have limited room for new deposits.

## Irreversible transactions

Transactions on Stellar are final once submitted. Nester cannot reverse,
cancel or refund a transaction you have signed. Verify the amount, asset and
vault before signing in your wallet.

## Yield is not guaranteed

Displayed APY is an estimate based on current protocol conditions and can change
or fall to zero. Past yield does not predict future yield.

## Related documents

- [Threat model](threat-model.md)
- [Incident response](incident-response.md)
- [Admin multisig](admin-multisig.md)
