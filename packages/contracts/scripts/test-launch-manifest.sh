#!/usr/bin/env bash
# Tests for launch-manifest.toml gating (#1501). Run: bash scripts/test-launch-manifest.sh
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
expect() {
  local want="$1" desc="$2"
  shift 2
  "$@" >/dev/null 2>&1
  local got=$?
  if { [ "$want" = "ok" ] && [ $got -ne 0 ]; } || { [ "$want" = "fail" ] && [ $got -ne 1 ]; }; then
    echo "FAIL: $desc (exit $got)"
    fail=1
  else
    echo "ok:   $desc"
  fi
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cat > "$tmp/manifest.toml" <<'TOML'
[[contract]]
package = "vault-contract"
wasm = "vault_contract"
audited_commit = "0123456789abcdef0123456789abcdef01234567"
max_wasm_bytes = 100

[[contract]]
package = "treasury-contract"
wasm = "treasury_contract"
audited_commit = ""
max_wasm_bytes = 100
TOML

M="$tmp/manifest.toml"
CHECK="python3 scripts/launch_manifest.py --manifest $M"

expect ok   "listed + audited contract is allowed"          $CHECK check vault-contract
expect fail "unlisted contract is refused"                  $CHECK check lp_aggregator
expect fail "rent_escrow placeholder is refused"            $CHECK check nester-rent-escrow
expect fail "listed but unaudited contract is refused"      $CHECK check treasury-contract

mkdir "$tmp/wasm"
head -c 50  /dev/zero > "$tmp/wasm/vault_contract.wasm"
expect ok   "wasm within size budget passes"                $CHECK size-gate "$tmp/wasm" --only vault-contract
head -c 500 /dev/zero > "$tmp/wasm/vault_contract.wasm"
expect fail "wasm over size budget fails"                   $CHECK size-gate "$tmp/wasm" --only vault-contract

expect ok   "shipped manifest lists only workspace packages" python3 scripts/launch_manifest.py validate
expect fail "deploy-mainnet refuses unlisted contract"      env DEPLOYER_KEY=x bash scripts/deploy-mainnet.sh lp_aggregator

exit $fail
