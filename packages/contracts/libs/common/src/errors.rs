use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InsufficientBalance = 4,
    InvalidAmount = 5,
    StrategyNotFound = 6,
    AllocationError = 7,
    RoleNotFound = 8,
    InvalidOperation = 9,
    TimelockNotReady = 10,
    TimelockExpired = 11,
    TimelockNotFound = 12,
    TimelockInvalidDelay = 13,
    TimelockAlreadyExecuted = 14,
}
