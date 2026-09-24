"""
Procedural 3D model generator for EDITH and FRIDAY Dual-Brain architecture.
Matches the exact Rust procedural algorithms in rust-models/src/
Outputs standard Wavefront OBJ files to dashboard/public/models/
"""

import math
import os

def generate_friday_orb(subdivisions=2, radius=2.0, out_path="dashboard/public/models/friday_orb.obj"):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    rings = 24 * subdivisions
    sectors = 48 * subdivisions

    vertices = []
    faces = []

    # 1. Harmonic UV sphere
    for r in range(rings + 1):
        theta = (r / rings) * math.pi
        sin_theta = math.sin(theta)
        cos_theta = math.cos(theta)

        for s in range(sectors + 1):
            phi = (s / sectors) * 2.0 * math.pi
            sin_phi = math.sin(phi)
            cos_phi = math.cos(phi)

            # Harmonic ripple
            ripple = math.sin(theta * 8.0) * math.cos(phi * 6.0) * 0.04 * radius
            cur_r = radius + ripple

            x = cur_r * sin_theta * cos_phi
            y = cur_r * cos_theta
            z = cur_r * sin_theta * sin_phi
            vertices.append((x, y, z))

    for r in range(rings):
        for s in range(sectors):
            first = r * (sectors + 1) + s
            second = first + (sectors + 1)
            # 1-indexed for OBJ
            faces.append((first + 1, second + 1, second + 2, first + 2))

    # 2. Orbital Torus Ring
    ring_segments = 64
    ring_radius_1 = radius * 1.35
    ring_tube_radius = radius * 0.025
    tilt_angle = 35.0 * (math.pi / 180.0)
    cos_tilt = math.cos(tilt_angle)
    sin_tilt = math.sin(tilt_angle)

    base_idx = len(vertices)
    for i in range(ring_segments):
        u = (i / ring_segments) * 2.0 * math.pi
        next_u = ((i + 1) / ring_segments) * 2.0 * math.pi

        for j in range(8):
            v = (j / 8.0) * 2.0 * math.pi
            next_v = ((j + 1) / 8.0) * 2.0 * math.pi

            for (cu, cv) in [(u, v), (next_u, v), (next_u, next_v), (u, next_v)]:
                raw_x = (ring_radius_1 + ring_tube_radius * math.cos(cv)) * math.cos(cu)
                raw_y = ring_tube_radius * math.sin(cv)
                raw_z = (ring_radius_1 + ring_tube_radius * math.cos(cv)) * math.sin(cu)
                y = raw_y * cos_tilt - raw_z * sin_tilt
                z = raw_y * sin_tilt + raw_z * cos_tilt
                vertices.append((raw_x, y, z))

            p_idx = len(vertices) - 4
            faces.append((p_idx + 1, p_idx + 2, p_idx + 3, p_idx + 4))

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("# FRIDAY Quantum Orb 3D Model\n")
        f.write("# Generated from Rust 3D Engine specifications\n")
        f.write("o friday_quantum_orb\n")
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        for face in faces:
            f.write("f " + " ".join(str(idx) for idx in face) + "\n")

    print(f"Generated {out_path}: {len(vertices)} vertices, {len(faces)} faces")


def generate_edith_core(size=3.0, out_path="dashboard/public/models/edith_core.obj"):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    half = size * 0.5
    vertices = []
    faces = []

    # Chamfered Cube Vertices
    offsets = [
        (-half, -half, -half),
        (half, -half, -half),
        (half, half, -half),
        (-half, half, -half),
        (-half, -half, half),
        (half, -half, half),
        (half, half, half),
        (-half, half, half),
    ]
    for o in offsets:
        vertices.append(o)

    # Faces (1-indexed)
    faces.append((5, 6, 7, 8))
    faces.append((2, 1, 4, 3))
    faces.append((4, 3, 7, 8))
    faces.append((1, 2, 6, 5))
    faces.append((1, 5, 8, 4))
    faces.append((6, 2, 3, 7))

    # Shield plate
    shield_z = half + size * 0.08
    s_w = size * 0.32
    s_h = size * 0.42
    shield_verts = [
        (-s_w, s_h * 0.6, shield_z),
        (s_w, s_h * 0.6, shield_z),
        (s_w, -s_h * 0.2, shield_z),
        (0.0, -s_h, shield_z),
        (-s_w, -s_h * 0.2, shield_z),
    ]
    s_base = len(vertices) + 1
    for sv in shield_verts:
        vertices.append(sv)
    faces.append((s_base, s_base + 1, s_base + 2, s_base + 3, s_base + 4))

    # Microchip satellites
    chip_size = size * 0.09
    chip_dist = half + size * 0.22
    for i in range(6):
        angle = (i / 6.0) * math.pi * 2.0
        cx = math.cos(angle) * chip_dist
        cy = math.sin(angle) * chip_dist
        cz = math.sin(i * 0.8) * size * 0.15

        c_base = len(vertices) + 1
        vertices.append((cx - chip_size, cy - chip_size, cz))
        vertices.append((cx + chip_size, cy - chip_size, cz))
        vertices.append((cx + chip_size, cy + chip_size, cz))
        vertices.append((cx - chip_size, cy + chip_size, cz))
        faces.append((c_base, c_base + 1, c_base + 2, c_base + 3))

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("# EDITH Cyber Core 3D Model\n")
        f.write("# Generated from Rust 3D Engine specifications\n")
        f.write("o edith_cyber_core\n")
        for v in vertices:
            f.write(f"v {v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
        for face in faces:
            f.write("f " + " ".join(str(idx) for idx in face) + "\n")

    print(f"Generated {out_path}: {len(vertices)} vertices, {len(faces)} faces")


if __name__ == "__main__":
    generate_friday_orb()
    generate_edith_core()
