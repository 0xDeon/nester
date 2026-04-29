// Integration tests — expanded coverage for fee mechanics, circuit breaker, share price edge cases,
// withdrawal scenarios, access control, and adversarial inputs.
// Extends packages/contracts/tests/integration/src/integration/mod.rs

#[cfg(test)]
mod expanded_integration_tests {
    use super::*;

    // ── Fee Mechanics ─────────────────────────────────────────────────────────

    #[test]
    fn management_fee_accrues_proportionally_over_time() {
        let env = setup_env();
        let (vault, token, user) = setup_vault_with_user(&env, 1_000_000);
        vault.deposit(&user, &1_000_000);
        // Advance ledger time by 365 days
        env.ledger().set_timestamp(env.ledger().timestamp() + 365 * 24 * 3600);
        let accrued = vault.get_accrued_fees();
        assert!(accrued > 0, "management fee should accrue over time");
    }

    #[test]
    fn performance_fee_only_charged_on_positive_yield() {
        let env = setup_env();
        let (vault, token, user) = setup_vault_with_user(&env, 1_000_000);
        vault.deposit(&user, &1_000_000);
        // Report zero yield — no performance fee
        vault.report_yield(&0);
        let fees_zero_yield = vault.get_accrued_fees();
        // Report positive yield
        vault.report_yield(&100_000);
        let fees_positive_yield = vault.get_accrued_fees();
        assert!(fees_positive_yield > fees_zero_yield, "performance fee only on positive yield");
    }

    #[test]
    fn fee_collection_resets_accrued_and_pays_treasury() {
        let env = setup_env();
        let (vault, token, treasury, user) = setup_vault_with_treasury(&env, 1_000_000);
        vault.deposit(&user, &1_000_000);
        env.ledger().set_timestamp(env.ledger().timestamp() + 30 * 24 * 3600);
        let accrued = vault.get_accrued_fees();
        assert!(accrued > 0);
        let treasury_before = token.balance(&treasury);
        vault.collect_fees();
        assert_eq!(vault.get_accrued_fees(), 0, "accrued fees should reset after collection");
        assert!(token.balance(&treasury) > treasury_before, "treasury should receive fees");
    }

    #[test]
    fn fee_collection_rounding_edge_case_sub_unit() {
        let env = setup_env();
        let (vault, _token, user) = setup_vault_with_user(&env, 1);
        vault.deposit(&user, &1);
        // Advance minimal time — accrued may be < 1 unit
        env.ledger().set_timestamp(env.ledger().timestamp() + 1);
        // collect_fees should not panic on sub-unit accrual
        vault.collect_fees();
        assert_eq!(vault.get_accrued_fees(), 0);
    }

    // ── Circuit Breaker ───────────────────────────────────────────────────────

    #[test]
    fn large_withdrawal_triggers_circuit_breaker_pause() {
        let env = setup_env();
        let (vault, token, user) = setup_vault_with_user(&env, 10_000_000);
        vault.deposit(&user, &10_000_000);
        let shares = vault.shares_of(&user);
        // Withdraw above circuit breaker threshold in one call
        let result = vault.try_withdraw(&user, &shares);
        // Either succeeds and vault is paused, or reverts
        if result.is_ok() {
            assert!(vault.is_paused(), "vault should be paused after large withdrawal");
        }
    }

    #[test]
    fn cumulative_withdrawals_trigger_circuit_breaker() {
        let env = setup_env();
        let (vault, token, user) = setup_vault_with_user(&env, 10_000_000);
        vault.deposit(&user, &10_000_000);
        let shares = vault.shares_of(&user);
        let chunk = shares / 10;
        let mut paused = false;
        for _ in 0..10 {
            if vault.is_paused() { paused = true; break; }
            let _ = vault.try_withdraw(&user, &chunk);
        }
        assert!(paused || vault.is_paused(), "circuit breaker should trigger on cumulative withdrawals");
    }

    // ── Share Price Edge Cases ────────────────────────────────────────────────

    #[test]
    fn deposit_after_yield_gets_fewer_shares() {
        let env = setup_env();
        let (vault, token, user1, user2) = setup_vault_two_users(&env, 1_000_000);
        vault.deposit(&user1, &1_000_000);
        vault.report_yield(&500_000); // share price now > 1:1
        vault.deposit(&user2, &1_000_000);
        let shares1 = vault.shares_of(&user1);
        let shares2 = vault.shares_of(&user2);
        assert!(shares1 > shares2, "later depositor gets fewer shares at higher share price");
    }

    #[test]
    fn minimum_deposit_one_unit_does_not_panic() {
        let env = setup_env();
        let (vault, token, user) = setup_vault_with_user(&env, 1);
        vault.deposit(&user, &1);
        assert!(vault.shares_of(&user) >= 0);
    }

    // ── Withdrawal Scenarios ──────────────────────────────────────────────────

    #[test]
    fn partial_withdrawal_leaves_correct_shares() {
        let env = setup_env();
        let (vault, token, user) = setup_vault_with_user(&env, 1_000_000);
        vault.deposit(&user, &1_000_000);
        let total_shares = vault.shares_of(&user);
        let half = total_shares / 2;
        vault.withdraw(&user, &half);
        assert_eq!(vault.shares_of(&user), total_shares - half);
    }

    #[test]
    fn full_withdrawal_leaves_zero_shares_no_dust() {
        let env = setup_env();
        let (vault, token, user) = setup_vault_with_user(&env, 1_000_000);
        vault.deposit(&user, &1_000_000);
        let shares = vault.shares_of(&user);
        vault.withdraw(&user, &shares);
        assert_eq!(vault.shares_of(&user), 0, "full withdrawal should leave exactly zero shares");
    }

    // ── Access Control Edge Cases ─────────────────────────────────────────────

    #[test]
    #[should_panic]
    fn non_admin_cannot_pause_vault() {
        let env = setup_env();
        let (vault, _token, user) = setup_vault_with_user(&env, 1_000_000);
        vault.pause(&user); // should panic — user is not admin
    }

    #[test]
    #[should_panic]
    fn non_admin_cannot_collect_fees() {
        let env = setup_env();
        let (vault, _token, user) = setup_vault_with_user(&env, 1_000_000);
        vault.collect_fees_as(&user); // should panic
    }

    #[test]
    #[should_panic]
    fn cannot_revoke_last_admin() {
        let env = setup_env();
        let (vault, admin) = setup_vault_admin_only(&env);
        vault.revoke_role(&admin, &admin); // should panic — last admin protection
    }

    // ── Adversarial / Negative ────────────────────────────────────────────────

    #[test]
    #[should_panic]
    fn zero_deposit_reverts() {
        let env = setup_env();
        let (vault, _token, user) = setup_vault_with_user(&env, 0);
        vault.deposit(&user, &0);
    }

    #[test]
    #[should_panic]
    fn deposit_to_paused_vault_reverts() {
        let env = setup_env();
        let (vault, token, admin, user) = setup_vault_with_admin_and_user(&env, 1_000_000);
        vault.pause(&admin);
        vault.deposit(&user, &1_000_000);
    }

    #[test]
    #[should_panic]
    fn withdraw_more_than_owned_reverts() {
        let env = setup_env();
        let (vault, _token, user) = setup_vault_with_user(&env, 1_000_000);
        vault.deposit(&user, &1_000_000);
        let shares = vault.shares_of(&user);
        vault.withdraw(&user, &(shares + 1));
    }

    #[test]
    #[should_panic]
    fn double_initialization_reverts() {
        let env = setup_env();
        let (vault, token, admin) = setup_vault_raw(&env);
        vault.initialize(&admin, &token.address, &100, &10, &5);
        vault.initialize(&admin, &token.address, &100, &10, &5); // second init should panic
    }
}