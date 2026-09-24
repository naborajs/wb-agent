"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface NativeFridayOrb3DProps {
  className?: string;
  size?: number;
  interactive?: boolean;
}

export default function NativeFridayOrb3D({
  className = "",
  size = 280,
  interactive = true,
}: NativeFridayOrb3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 7.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00d2fe, 5, 20);
    cyanLight.position.set(4, 3, 5);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 4.5, 20);
    purpleLight.position.set(-4, -3, 3);
    scene.add(purpleLight);

    // 3. Central Quantum Core (Layered Icosahedron & Glowing Spheres)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Inner Glowing Core
    const innerGeom = new THREE.SphereGeometry(1.35, 32, 32);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x00d2fe,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.85,
      ior: 1.4,
      transparent: true,
      opacity: 0.82,
    });
    const innerSphere = new THREE.Mesh(innerGeom, innerMat);
    coreGroup.add(innerSphere);

    // Outer Geodesic Wireframe Lattice
    const wireGeom = new THREE.IcosahedronGeometry(1.65, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    coreGroup.add(wireMesh);

    // 4. Concentric Orbital 3D Rings
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00d2fe,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ringGeom1 = new THREE.TorusGeometry(2.1, 0.035, 16, 100);
    const ring1 = new THREE.Mesh(ringGeom1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    scene.add(ring1);

    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.4,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ringGeom2 = new THREE.TorusGeometry(2.4, 0.028, 16, 100);
    const ring2 = new THREE.Mesh(ringGeom2, ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 5;
    scene.add(ring2);

    // 5. Orbital Particle Cloud
    const particleCount = 120;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const rad = 2.0 + Math.random() * 0.9;

      particlePositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = rad * Math.cos(phi);
      particlePositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
    }
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.045,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // 6. Mouse Interaction & Spring Rotation
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = nx * 0.8;
      targetY = ny * 0.8;
    };

    const onMouseEnter = () => {
      isHoveredRef.current = true;
    };
    const onMouseLeave = () => {
      isHoveredRef.current = false;
      targetX = 0;
      targetY = 0;
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const speedMult = isHoveredRef.current ? 1.6 : 1.0;

      // Mouse smoothing
      mouseX += (targetX - mouseX) * 0.08;
      mouseY += (targetY - mouseY) * 0.08;

      // Core rotation
      coreGroup.rotation.y = elapsed * 0.35 * speedMult + mouseX * 0.5;
      coreGroup.rotation.x = Math.sin(elapsed * 0.2) * 0.15 + mouseY * 0.5;

      // Wireframe counter-rotation
      wireMesh.rotation.y = -elapsed * 0.25 * speedMult;
      wireMesh.rotation.z = elapsed * 0.15;

      // Ring rotations
      ring1.rotation.z = elapsed * 0.45 * speedMult;
      ring1.rotation.y = Math.PI / 6 + mouseX * 0.3;

      ring2.rotation.z = -elapsed * 0.35 * speedMult;
      ring2.rotation.x = -Math.PI / 4 + mouseY * 0.3;

      // Particles orbit
      particles.rotation.y = elapsed * 0.12 * speedMult;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);

      renderer.dispose();
      innerGeom.dispose();
      innerMat.dispose();
      wireGeom.dispose();
      wireMat.dispose();
      ringGeom1.dispose();
      ringMat1.dispose();
      ringGeom2.dispose();
      ringMat2.dispose();
      particleGeom.dispose();
      particleMat.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size, interactive]);

  return (
    <div
      ref={mountRef}
      className={`relative flex items-center justify-center select-none cursor-pointer ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
