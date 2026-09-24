//! Procedural 3D Model Generation Library for EDITH and FRIDAY Dual-Brain Platform

pub mod mesh;
pub mod friday_orb;
pub mod edith_core;

pub use mesh::Mesh;
pub use friday_orb::generate_friday_orb;
pub use edith_core::generate_edith_core;
