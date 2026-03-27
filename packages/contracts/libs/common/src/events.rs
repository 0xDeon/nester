use soroban_sdk::{Address, Env, IntoVal, Symbol, Val};

/// Helper to emit a standardized Nester event.
///
/// All events follow the 3-topic structure: `(contract, action, entity)`.
pub fn emit_event(
    env: &Env,
    contract: Symbol,
    action: Symbol,
    entity: Address,
    data: impl IntoVal<Env, Val>,
) {
    env.events().publish((contract, action, entity), data);
}

/// Helper to emit an event where the entity is a Symbol (e.g. Registry source_id).
pub fn emit_event_with_sym(
    env: &Env,
    contract: Symbol,
    action: Symbol,
    entity: Symbol,
    data: impl IntoVal<Env, Val>,
) {
    env.events().publish((contract, action, entity), data);
}
