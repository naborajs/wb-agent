//! CLI Entrypoint to execute Rust Procedural 3D Model Generation

use std::fs;
use std::path::Path;
use wb_agent_3d_models::{generate_edith_core, generate_friday_orb};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🦀 Generating 3D Models in Rust for EDITH & FRIDAY...");

    let output_dirs = [
        "output",
        "../dashboard/public/models",
    ];

    for dir in &output_dirs {
        fs::create_dir_all(dir)?;
    }

    // 1. Generate FRIDAY Ethereal Quantum Orb (Subdivision level 2, radius 2.0)
    println!("-> Generating FRIDAY Quantum Orb 3D Mesh...");
    let friday_orb = generate_friday_orb(2, 2.0);
    println!(
        "   Vertices: {}, Faces: {}",
        friday_orb.vertices.len(),
        friday_orb.faces.len()
    );

    for dir in &output_dirs {
        let path = Path::new(dir).join("friday_orb.obj");
        friday_orb.export_obj(&path)?;
        println!("   Saved to: {}", path.display());
    }

    // 2. Generate EDITH Cybernetic Monolithic Core (Size 3.0)
    println!("-> Generating EDITH Cyber Core 3D Mesh...");
    let edith_core = generate_edith_core(3.0);
    println!(
        "   Vertices: {}, Faces: {}",
        edith_core.vertices.len(),
        edith_core.faces.len()
    );

    for dir in &output_dirs {
        let path = Path::new(dir).join("edith_core.obj");
        edith_core.export_obj(&path)?;
        println!("   Saved to: {}", path.display());
    }

    println!("✅ All 3D Models generated successfully by Rust engine!");
    Ok(())
}
