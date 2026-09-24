//! Procedural 3D Generator for FRIDAY Ethereal Quantum Sphere

use crate::mesh::{Mesh, Vec3};
use std::f32::consts::PI;

/// Generate FRIDAY's Ethereal Quantum Neural Sphere with Concentric Orbital Rings
pub fn generate_friday_orb(subdivisions: u32, radius: f32) -> Mesh {
    let mut mesh = Mesh::new("friday_quantum_orb");

    let rings = 24 * subdivisions;
    let sectors = 48 * subdivisions;

    // 1. Generate UV Sphere with subtle harmonic surface displacement
    for r in 0..=rings {
        let theta = (r as f32 / rings as f32) * PI;
        let sin_theta = theta.sin();
        let cos_theta = theta.cos();

        for s in 0..=sectors {
            let phi = (s as f32 / sectors as f32) * 2.0 * PI;
            let sin_phi = phi.sin();
            let cos_phi = phi.cos();

            // Subtle harmonic neural ripple
            let ripple = (theta * 8.0).sin() * (phi * 6.0).cos() * 0.04 * radius;
            let current_radius = radius + ripple;

            let x = current_radius * sin_theta * cos_phi;
            let y = current_radius * cos_theta;
            let z = current_radius * sin_theta * sin_phi;

            mesh.add_vertex(Vec3::new(x, y, z));
        }
    }

    // Connect spherical quads
    for r in 0..rings {
        for s in 0..sectors {
            let first = (r * (sectors + 1) + s) as usize;
            let second = first + (sectors + 1) as usize;

            mesh.add_face(&[first, second, second + 1, first + 1]);
        }
    }

    // 2. Add Concentric Orbital Rings (Equatorial and Tilted 3D Rings)
    let ring_segments = 64;
    let ring_radius_1 = radius * 1.35;
    let ring_tube_radius = radius * 0.025;

    // Torus Ring 1 (Tilted 35 degrees)
    let tilt_angle = 35.0 * (PI / 180.0);
    let cos_tilt = tilt_angle.cos();
    let sin_tilt = tilt_angle.sin();

    for i in 0..ring_segments {
        let u = (i as f32 / ring_segments as f32) * 2.0 * PI;
        let next_u = ((i + 1) as f32 / ring_segments as f32) * 2.0 * PI;

        for j in 0..8 {
            let v = (j as f32 / 8.0) * 2.0 * PI;
            let next_v = ((j + 1) as f32 / 8.0) * 2.0 * PI;

            let p0 = torus_point(u, v, ring_radius_1, ring_tube_radius, cos_tilt, sin_tilt);
            let p1 = torus_point(next_u, v, ring_radius_1, ring_tube_radius, cos_tilt, sin_tilt);
            let p2 = torus_point(next_u, next_v, ring_radius_1, ring_tube_radius, cos_tilt, sin_tilt);
            let p3 = torus_point(u, next_v, ring_radius_1, ring_tube_radius, cos_tilt, sin_tilt);

            let i0 = mesh.add_vertex(p0);
            let i1 = mesh.add_vertex(p1);
            let i2 = mesh.add_vertex(p2);
            let i3 = mesh.add_vertex(p3);

            mesh.add_face(&[i0, i1, i2, i3]);
        }
    }

    mesh.compute_vertex_normals();
    mesh
}

fn torus_point(u: f32, v: f32, major_r: f32, minor_r: f32, cos_tilt: f32, sin_tilt: f32) -> Vec3 {
    let raw_x = (major_r + minor_r * v.cos()) * u.cos();
    let raw_y = minor_r * v.sin();
    let raw_z = (major_r + minor_r * v.cos()) * u.sin();

    // Rotate around X axis by tilt
    let y = raw_y * cos_tilt - raw_z * sin_tilt;
    let z = raw_y * sin_tilt + raw_z * cos_tilt;

    Vec3::new(raw_x, y, z)
}
