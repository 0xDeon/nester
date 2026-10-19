# Verifying Nester contracts

Before signing a deposit, confirm the app is talking to the real contracts.

1. Open the **Contracts** section on a vault page or `/security`. It lists the
   vault, vault token, treasury and other launch contracts for the network you
   are connected to.
2. Compare each address with the one shown by your wallet when it asks you to
   sign. They must match exactly.
3. Open the stellar.expert link next to each address and confirm the contract
   exists on the same network (testnet or public).
4. Compare the WASM hash shown in the app with the one stellar.expert reports
   for the contract. A mismatch means the deployed code is not what was
   published.

If anything does not match, do not sign. Report it via the channel in
[SECURITY.md](SECURITY.md).
