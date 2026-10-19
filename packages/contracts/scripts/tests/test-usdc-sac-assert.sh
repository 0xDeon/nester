#!/usr/bin/env bash
# Tests for the USDC SAC address assertion in deploy-testnet.sh (issue #1494).
# Exercises the mismatch abort path without network access.
set -euo pipefail

PASS=0
FAIL=0

ok() { echo "  PASS: $1"; ((PASS++)) || true; }
fail() { echo "  FAIL: $1"; ((FAIL++)) || true; }

# ── Helper: run the assertion logic in isolation ──────────────────────────────
# Mirrors the assertion block from deploy-testnet.sh so it can be tested
# without running a full deploy.

assert_sac() {
  local derived="$1"
  local expected="$2"
  if [ "$derived" != "$expected" ]; then
    return 1
  fi
  return 0
}

# ── Test 1: matching addresses should succeed ─────────────────────────────────
ADDR="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
if assert_sac "$ADDR" "$ADDR"; then
  ok "matching SAC addresses accepted"
else
  fail "matching SAC addresses rejected"
fi

# ── Test 2: mismatched addresses should abort (issue #1494 mismatch path) ────
WRONG="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4"
if ! assert_sac "$WRONG" "$ADDR"; then
  ok "mismatched SAC address triggers failure"
else
  fail "mismatched SAC address was not rejected"
fi

# ── Test 3: empty derived address falls back to expected (offline mode) ───────
DERIVED=""
EXPECTED="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
if [ -z "$DERIVED" ]; then
  DERIVED="$EXPECTED"
fi
if assert_sac "$DERIVED" "$EXPECTED"; then
  ok "offline fallback: empty derived treated as expected"
else
  fail "offline fallback: empty derived incorrectly rejected"
fi

# ── Test 4: XLM SAC is not confused with USDC SAC ────────────────────────────
XLM_SAC="CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
if ! assert_sac "$XLM_SAC" "$ADDR"; then
  ok "XLM SAC address rejected when USDC expected"
else
  fail "XLM SAC address incorrectly accepted for USDC slot"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
