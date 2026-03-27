#![no_std]

pub mod constants;
pub mod errors;
pub mod events;
pub mod storage;

pub use constants::*;
pub use errors::ContractError;
pub use events::*;
pub use storage::*;

#[cfg(test)]
mod tests {
    use super::BASIS_POINT_SCALE;

    #[test]
    fn test_basis_point_precision() {
        assert_eq!(BASIS_POINT_SCALE, 10000);
    }
}
