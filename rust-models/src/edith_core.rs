//! Procedural 3D Generator for EDITH Cybernetic Monolithic Core

use crate::mesh::{Mesh, Vec3};

/// Generate EDITH Cybernetic Monolithic Core with beveled chamfers and central shield plate
pub fn generate_edith_core(size: f32) -> Mesh {
    let mut mesh = Mesh::new("edith_cyber_core");
    let half = size * 0.5;
    let chamfer = size * 0.12;

    // 8 Main vertices of chamfered central cube
    let offsets = [
        (-half, -half, -half),
        (half, -half, -half),
        (half, half, -half),
        (-half, half, -half),
        (-half, -half, half),
        (half, -half, half),
        (half, half, half),
        (-half, half, half),
    ];

    let base_indices: Vec<usize> = offsets
        .iter()
        .map(|&(x, y, z)| mesh.add_vertex(Vec3::new(x, y, z)))
        .collect();

    // 6 Faces of outer chassis
    // Front face
    mesh.add_face(&[base_indices[4], base_indices[5], base_indices[6], base_indices[7]]);
    // Back face
    mesh.add_face(&[base_indices[1], base_indices[0], base_indices[3], base_indices[2]]);
    // Top face
    mesh.add_face(&[base_indices[3], base_indices[2], base_indices[6], base_indices[7]]);
    // Bottom face
    mesh.add_face(&[base_indices[0], base_indices[1], base_indices[5], base_indices[4]]);
    // Left face
    mesh.add_face(&[base_indices[0], base_indices[4], base_indices[7], base_indices[3]]);
    // Right face
    mesh.add_face(&[base_indices[5], base_indices[1], base_indices[2], base_indices[6]]);

    // Central Shield Emblem Raised Boss on Front Face
    let shield_z = half + size * 0.08;
    let s_w = size * 0.32;
    let s_h = size * 0.42;

    let s0 = mesh.add_vertex(Vec3::new(-s_w, s_h * 0.6, shield_z));
    let s1 = mesh.add_vertex(Vec3::new(s_w, s_h * 0.6, shield_z));
    let s2 = mesh.add_vertex(Vec3::new(s_w, -s_h * 0.2, shield_z));
    let s3 = mesh.add_vertex(Vec3::new(0.0, -s_h, shield_z));
    let s4 = mesh.add_vertex(Vec3::new(-s_w, -s_h * 0.2, shield_z));

    mesh.add_face(&[s0, s1, s2, s3, s4]);

    // Add perimeter floating satellite microchip nodes
    let chip_size = size * 0.09;
    let chip_dist = half + size * 0.22;

    for i in 0..6 {
        let angle = (i as f32 / 6.0) * std::f32::consts::PI * 2.0;
        let cx = angle.cos() * chip_dist;
        let cy = angle.sin() * chip_dist;
        let cz = (i as f32 * 0.8).sin() * size * 0.15;

        let c0 = mesh.add_vertex(Vec3::new(cx - chip_size, cy - chip_size, cz));
        let c1 = mesh.add_vertex(Vec3::new(cx + chip_size, cy - chip_size, cz));
        let c2 = mesh.add_vertex(Vec3::new(cx + chip_size, cy + chip_size, cz));
        let c3 = mesh.add_vertex(Vec3::new(cx - chip_size, cy + chip_size, cz));

        mesh.add_face(&[c0, c1, c2, c3]);
    }

    mesh.compute_vertex_normals();
    mesh
}
