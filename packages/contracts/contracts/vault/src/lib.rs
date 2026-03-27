#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

use nester_access_control::{AccessControl, Role};
use nester_common::{emit_event, ContractError};

const VAULT: Symbol = symbol_short!("VAULT");
const DEPOSIT: Symbol = symbol_short!("DEPOSIT");
const WITHDRAW: Symbol = symbol_short!("WITHDRAW");
const PAUSE: Symbol = symbol_short!("PAUSE");
const UNPAUSE: Symbol = symbol_short!("UNPAUSE");

#[contracttype]
#[derive(Clone, Debug)]
pub struct DepositEventData {
    pub amount: i128,
    pub shares_minted: i128,
    pub new_balance: i128,
    pub total_deposits: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct WithdrawEventData {
    pub amount: i128,
    pub shares_burned: i128,
    pub new_balance: i128,
    pub total_deposits: i128,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct TimestampEventData {
    pub timestamp: u64,
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Paused,
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct VaultContract;

#[contractimpl]
impl VaultContract {
    /// Initialise the vault, setting `admin` as the sole Admin.
    ///
    /// Must be called once before any other function.
    pub fn initialize(env: Env, admin: Address) {
        AccessControl::initialize(&env, &admin);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    // -----------------------------------------------------------------------
    // Admin operations
    // -----------------------------------------------------------------------

    /// Pause all vault operations. Requires [`Role::Admin`].
    pub fn pause(env: Env, caller: Address) {
        caller.require_auth();
        AccessControl::require_role(&env, &caller, Role::Admin);
        env.storage().instance().set(&DataKey::Paused, &true);
        emit_event(
            &env,
            VAULT,
            PAUSE,
            caller.clone(),
            TimestampEventData {
                timestamp: env.ledger().timestamp(),
            },
        );
    }

    /// Resume vault operations. Requires [`Role::Admin`].
    pub fn unpause(env: Env, caller: Address) {
        caller.require_auth();
        AccessControl::require_role(&env, &caller, Role::Admin);
        env.storage().instance().set(&DataKey::Paused, &false);
        emit_event(
            &env,
            VAULT,
            UNPAUSE,
            caller.clone(),
            TimestampEventData {
                timestamp: env.ledger().timestamp(),
            },
        );
    }

    /// Grant `role` to `grantee`. Requires caller to be an Admin.
    pub fn grant_role(env: Env, grantor: Address, grantee: Address, role: Role) {
        AccessControl::grant_role(&env, &grantor, &grantee, role);
    }

    /// Revoke `role` from `target`. Requires caller to be an Admin.
    pub fn revoke_role(env: Env, revoker: Address, target: Address, role: Role) {
        AccessControl::revoke_role(&env, &revoker, &target, role);
    }

    /// Propose an admin transfer (step 1). Requires caller to be an Admin.
    pub fn transfer_admin(env: Env, current_admin: Address, new_admin: Address) {
        AccessControl::transfer_admin(&env, &current_admin, &new_admin);
    }

    /// Accept a proposed admin transfer (step 2). Caller must be the pending new admin.
    pub fn accept_admin(env: Env, new_admin: Address) {
        AccessControl::accept_admin(&env, &new_admin);
    }

    // -----------------------------------------------------------------------
    // Core vault operations
    // -----------------------------------------------------------------------

    /// Deposit funds into the vault.
    pub fn deposit(env: Env, caller: Address, amount: i128) {
        caller.require_auth();
        Self::require_not_paused(&env);
        // TODO: deposit logic
        // For now, emit event with dummy values to satisfy schema
        emit_event(
            &env,
            VAULT,
            DEPOSIT,
            caller,
            DepositEventData {
                amount,
                shares_minted: amount, // dummy
                new_balance: amount,   // dummy
                total_deposits: amount, // dummy
            },
        );
    }

    /// Withdraw funds from the vault.
    pub fn withdraw(env: Env, caller: Address, amount: i128) {
        caller.require_auth();
        Self::require_not_paused(&env);
        // TODO: withdrawal logic
        // For now, emit event with dummy values to satisfy schema
        emit_event(
            &env,
            VAULT,
            WITHDRAW,
            caller,
            WithdrawEventData {
                amount,
                shares_burned: amount, // dummy
                new_balance: 0,        // dummy
                total_deposits: 0,     // dummy
            },
        );
    }

    /// Return the vault balance.
    pub fn balance(_env: Env) -> u64 {
        // TODO: balance logic
        0
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        if paused {
            soroban_sdk::panic_with_error!(env, ContractError::InvalidOperation);
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    extern crate std;

    use soroban_sdk::{testutils::Address as _, Env};

    use super::{VaultContract, VaultContractClient};

    fn setup() -> (Env, soroban_sdk::Address) {
        let env = Env::default();
        env.mock_all_auths();
        let admin = soroban_sdk::Address::generate(&env);
        let contract_id = env.register_contract(None, VaultContract);
        let client = VaultContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        (env, admin)
    }

    #[test]
    fn vault_initializes_and_is_not_paused() {
        let (env, admin) = setup();
        let contract_id = env.register_contract(None, VaultContract);
        let client = VaultContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        assert!(!client.is_paused());
    }

    #[test]
    fn admin_can_pause_and_unpause() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = soroban_sdk::Address::generate(&env);
        let contract_id = env.register_contract(None, VaultContract);
        let client = VaultContractClient::new(&env, &contract_id);
        client.initialize(&admin);

        client.pause(&admin);
        assert!(client.is_paused());

        client.unpause(&admin);
        assert!(!client.is_paused());
    }

    #[test]
    #[should_panic]
    fn non_admin_cannot_pause() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = soroban_sdk::Address::generate(&env);
        let outsider = soroban_sdk::Address::generate(&env);
        let contract_id = env.register_contract(None, VaultContract);
        let client = VaultContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.pause(&outsider);
    }

    #[test]
    #[should_panic]
    fn deposit_fails_when_paused() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = soroban_sdk::Address::generate(&env);
        let contract_id = env.register_contract(None, VaultContract);
        let client = VaultContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.pause(&admin);
        client.deposit(&admin, &1000); // must panic
    }
}
