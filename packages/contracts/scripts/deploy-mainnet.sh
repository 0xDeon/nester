#!/usr/bin/env bash
# =============================================================================
# Nester Soroban Mainnet Deployment Script (#1501)
#
# Deploys ONE contract that is listed, with an audited_commit, in
# launch-manifest.toml. Anything else is refused before any build or network call.
#
# Usage:
#   DEPLOYER_KEY=<stellar-cli identity> bash scripts/deploy-mainnet.sh <package>
#   e.g. bash scripts/deploy-mainnet.sh vault-contract
#
# Initialization and role handover are separate steps; see
# docs/security/admin-multisig.md and scripts/verify-mainnet-roles.sh.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

PACKAGE="${1:?usage: deploy-mainnet.sh <package>}"

python3 scripts/launch_manifest.py check "$PACKAGE"

: "${DEPLOYER_KEY:?DEPLOYER_KEY (stellar-cli identity) is required}"

NETWORK="mainnet"
RPC_URL="${RPC_URL:-https://soroban-rpc.mainnet.stellar.org}"
NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
WASM_DIR="./target/wasm32-unknown-unknown/release"

# vault imports vault_token's WASM via contractimport!, so build it first.
cargo build --release --target wasm32-unknown-unknown -p vault-token-contract
cargo build --release --target wasm32-unknown-unknown -p "$PACKAGE"

python3 scripts/launch_manifest.py size-gate "$WASM_DIR" --only "$PACKAGE"

WASM_NAME=$(python3 - "$PACKAGE" <<'PY'
import sys
sys.path.insert(0, "scripts")
import launch_manifest
print(launch_manifest.workspace_wasm_names()[sys.argv[1]])
PY
)

stellar contract optimize \
  --wasm "$WASM_DIR/${WASM_NAME}.wasm" \
  --wasm-out "$WASM_DIR/${WASM_NAME}_opt.wasm"

stellar contract deploy \
  --wasm "$WASM_DIR/${WASM_NAME}_opt.wasm" \
  --source-account "$DEPLOYER_KEY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE"
