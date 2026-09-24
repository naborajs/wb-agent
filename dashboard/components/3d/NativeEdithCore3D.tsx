"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface NativeEdithCore3DProps {
  className?: string;
  size?: number;
  interactive?: boolean;
}

export default function NativeEdithCore3D({
  className = "",
  size = 280,
  interactive = true,
}: NativeEdithCore3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const isHoveredRef = useRef(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 7.2;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const amberLight = new THREE.PointLight(0xf59e0b, 5.5, 20);
    amberLight.position.set(3, 4, 5);
    scene.add(amberLight);

    const cyanLight = new THREE.PointLight(0x00d2fe, 4.0, 20);
    cyanLight.position.set(-3, -3, 4);
    scene.add(cyanLight);

    // 3. Central Cybernetic Monolithic Processor
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Outer Beveled Chassis (Box Geometry)
    const chassisGeom = new THREE.BoxGeometry(2.2, 2.2, 2.2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: false,
    });
    const chassis = new THREE.Mesh(chassisGeom, chassisMat);
    coreGroup.add(chassis);

    // Wireframe Conduits Edge Highlight
    const edgesGeom = new THREE.EdgesGeometry(chassisGeom);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.75,
    });
    const edges = new THREE.LineSegments(edgesGeom, edgesMat);
    coreGroup.add(edges);

    // Central Glowing Shield Emblem Core (Torus Knot / Octahedron combo)
    const shieldGeom = new THREE.OctahedronGeometry(1.0, 0);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      metalness: 0.5,
      roughness: 0.2,
      wireframe: true,
    });
    const shieldMesh = new THREE.Mesh(shieldGeom, shieldMat);
    coreGroup.add(shieldMesh);

    // Inner Glowing Amber Sphere
    const innerLightGeom = new THREE.SphereGeometry(0.7, 16, 16);
    const innerLightMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.8,
    });
    const innerLight = new THREE.Mesh(innerLightGeom, innerLightMat);
    coreGroup.add(innerLight);

    // 4. Orbiting Satellite Microchips
    const satellitesGroup = new THREE.Group();
    scene.add(satellitesGroup);

    const chipCount = 6;
    const chipGeom = new THREE.BoxGeometry(0.28, 0.28, 0.08);
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      metalness: 0.9,
      roughness: 0.2,
    });

    const chipMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < chipCount; i++) {
      const chip = new THREE.Mesh(chipGeom, chipMat);
      satellitesGroup.add(chip);
      chipMeshes.push(chip);
    }

    // 5. Mouse Interaction & Dynamic Spring Rotation
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = nx * 0.9;
      targetY = ny * 0.9;
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

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const speedMult = isHoveredRef.current ? 1.5 : 1.0;

      // Mouse smoothing
      mouseX += (targetX - mouseX) * 0.08;
      mouseY += (targetY - mouseY) * 0.08;

      // Core rotation with mouse parallax
      coreGroup.rotation.y = elapsed * 0.25 * speedMult + mouseX * 0.5;
      coreGroup.rotation.x = Math.sin(elapsed * 0.2) * 0.1 + mouseY * 0.5;

      // Inner shield pulse
      const scale = 1.0 + Math.sin(elapsed * 2.5) * 0.06;
      shieldMesh.scale.set(scale, scale, scale);
      shieldMesh.rotation.y = -elapsed * 0.5;
      shieldMesh.rotation.z = elapsed * 0.3;

      // Orbiting satellites
      satellitesGroup.rotation.y = elapsed * 0.4 * speedMult;
      satellitesGroup.rotation.x = Math.sin(elapsed * 0.3) * 0.2;

      chipMeshes.forEach((chip, i) => {
        const angle = (i / chipCount) * Math.PI * 2 + elapsed * 0.2;
        const rad = 2.3 + Math.sin(elapsed * 1.5 + i) * 0.15;
        chip.position.x = Math.cos(angle) * rad;
        chip.position.z = Math.sin(angle) * rad;
        chip.position.y = Math.sin(angle * 2.0) * 0.35;
        chip.rotation.y = angle + Math.PI / 2;
        chip.rotation.x = elapsed;
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);

      renderer.dispose();
      chassisGeom.dispose();
      chassisMat.dispose();
      edgesGeom.dispose();
      edgesMat.dispose();
      shieldGeom.dispose();
      shieldMat.dispose();
      innerLightGeom.dispose();
      innerLightMat.dispose();
      chipGeom.dispose();
      chipMat.dispose();

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
