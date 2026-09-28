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
  const pulseBoostRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 1000);
    camera.position.z = 7.4;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 2. Luminous Multi-Spectrum Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const cyanLight = new THREE.PointLight(0x00d2fe, 7.5, 25);
    cyanLight.position.set(4, 3, 5);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 7.5, 25);
    purpleLight.position.set(-4, -3, 5);
    scene.add(purpleLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 4.5, 20);
    emeraldLight.position.set(0, 4, -4);
    scene.add(emeraldLight);

    // 3. Central Quantum Acoustic Core
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Innermost Brilliant Heart
    const heartGeom = new THREE.SphereGeometry(0.72, 32, 32);
    const heartMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.95,
    });
    const heartSphere = new THREE.Mesh(heartGeom, heartMat);
    coreGroup.add(heartSphere);

    // Mid Plasma Harmonic Sphere
    const innerGeom = new THREE.SphereGeometry(1.18, 32, 32);
    const innerMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.65,
      specular: 0xffffff,
      shininess: 110,
      transparent: true,
      opacity: 0.78,
    });
    const innerSphere = new THREE.Mesh(innerGeom, innerMat);
    coreGroup.add(innerSphere);

    // Outer Geodesic Acoustic Lattice (Cyan)
    const wireGeom = new THREE.IcosahedronGeometry(1.52, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.48,
    });
    const wireMesh = new THREE.Mesh(wireGeom, wireMat);
    coreGroup.add(wireMesh);

    // Secondary Counter-Rotating Violet Lattice
    const wireGeom2 = new THREE.IcosahedronGeometry(1.72, 1);
    const wireMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
    });
    const wireMesh2 = new THREE.Mesh(wireGeom2, wireMat2);
    coreGroup.add(wireMesh2);

    // 4. Concentric Harmonic Resonance Rings
    const ringMat1 = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      shininess: 100,
    });
    const ringGeom1 = new THREE.TorusGeometry(2.05, 0.035, 16, 100);
    const ring1 = new THREE.Mesh(ringGeom1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = Math.PI / 6;
    scene.add(ring1);

    const ringMat2 = new THREE.MeshPhongMaterial({
      color: 0xa855f7,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.65,
      shininess: 100,
    });
    const ringGeom2 = new THREE.TorusGeometry(2.35, 0.028, 16, 100);
    const ring2 = new THREE.Mesh(ringGeom2, ringMat2);
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 5;
    scene.add(ring2);

    const ringMat3 = new THREE.MeshPhongMaterial({
      color: 0x34d399,
      emissive: 0x059669,
      emissiveIntensity: 0.55,
      shininess: 100,
    });
    const ringGeom3 = new THREE.TorusGeometry(2.58, 0.02, 16, 100);
    const ring3 = new THREE.Mesh(ringGeom3, ringMat3);
    ring3.rotation.y = -Math.PI / 3;
    scene.add(ring3);

    // 5. Orbital Acoustic Particle Starfield
    const particleCount = 140;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const cCyan = new THREE.Color(0x38bdf8);
    const cPurple = new THREE.Color(0xa855f7);
    const cMint = new THREE.Color(0x34d399);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const rad = 1.95 + Math.random() * 0.95;

      particlePositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = rad * Math.cos(phi);
      particlePositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);

      const c = i % 3 === 0 ? cCyan : i % 3 === 1 ? cPurple : cMint;
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeom.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const particles = new THREE.Points(particleGeom, particleMat);
    scene.add(particles);

    // 6. Mouse Interaction & Click Pulse
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = nx * 0.85;
      targetY = ny * 0.85;
    };

    const onMouseEnter = () => {
      isHoveredRef.current = true;
    };
    const onMouseLeave = () => {
      isHoveredRef.current = false;
      targetX = 0;
      targetY = 0;
    };
    const onClick = () => {
      pulseBoostRef.current = 1.0;
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("click", onClick);

    // 7. Animation Loop (Paused when scrolled out of viewport)
    let animId: number;
    let isVisible = true;
    const clock = new THREE.Clock();

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible || document.hidden) return;

      const elapsed = clock.getElapsedTime();
      pulseBoostRef.current *= 0.94;
      const speedMult = (isHoveredRef.current ? 1.6 : 1.0) + pulseBoostRef.current * 2.0;

      // Mouse smoothing
      mouseX += (targetX - mouseX) * 0.08;
      mouseY += (targetY - mouseY) * 0.08;

      // Acoustic waveform breathing scale
      const breath = 1.0 + Math.sin(elapsed * 3.0) * 0.06 + pulseBoostRef.current * 0.16;
      innerSphere.scale.set(breath, breath, breath);
      heartSphere.scale.set(breath * 0.95, breath * 0.95, breath * 0.95);

      // Core rotation
      coreGroup.rotation.y = elapsed * 0.35 * speedMult + mouseX * 0.5;
      coreGroup.rotation.x = Math.sin(elapsed * 0.25) * 0.18 + mouseY * 0.5;

      // Wireframe counter-rotations
      wireMesh.rotation.y = -elapsed * 0.28 * speedMult;
      wireMesh.rotation.z = elapsed * 0.18;

      wireMesh2.rotation.x = elapsed * 0.22 * speedMult;
      wireMesh2.rotation.y = elapsed * 0.32 * speedMult;

      // Ring rotations
      ring1.rotation.z = elapsed * 0.48 * speedMult;
      ring1.rotation.y = Math.PI / 6 + mouseX * 0.3;

      ring2.rotation.z = -elapsed * 0.38 * speedMult;
      ring2.rotation.x = -Math.PI / 4 + mouseY * 0.3;

      ring3.rotation.z = elapsed * 0.28 * speedMult;
      ring3.rotation.x = Math.sin(elapsed * 0.3) * 0.25;

      // Particles orbit
      particles.rotation.y = elapsed * 0.14 * speedMult;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animId);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("click", onClick);

      renderer.dispose();
      heartGeom.dispose();
      heartMat.dispose();
      innerGeom.dispose();
      innerMat.dispose();
      wireGeom.dispose();
      wireMat.dispose();
      wireGeom2.dispose();
      wireMat2.dispose();
      ringGeom1.dispose();
      ringMat1.dispose();
      ringGeom2.dispose();
      ringMat2.dispose();
      ringGeom3.dispose();
      ringMat3.dispose();
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
      title="Interactive 3D FRIDAY Acoustic Orb — Hover to rotate, Click to pulse"
    />
  );
}
