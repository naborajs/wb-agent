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

    // 2. Multi-Point Studio & Cybernetic Lighting (Never renders black!)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyAmberLight = new THREE.PointLight(0xf59e0b, 8.0, 25);
    keyAmberLight.position.set(4, 4, 5);
    scene.add(keyAmberLight);

    const rimCyanLight = new THREE.PointLight(0x00d2fe, 7.0, 25);
    rimCyanLight.position.set(-4, -3, 5);
    scene.add(rimCyanLight);

    const topEmeraldLight = new THREE.PointLight(0x10b981, 4.5, 20);
    topEmeraldLight.position.set(0, 5, -3);
    scene.add(topEmeraldLight);

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 3. Inner Radiant Plasma Sun (Heart of Nemotron 3.5)
    const plasmaGeom = new THREE.SphereGeometry(0.62, 32, 32);
    const plasmaMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
    });
    const plasmaCore = new THREE.Mesh(plasmaGeom, plasmaMat);
    coreGroup.add(plasmaCore);

    // 4. Faceted Crystalline Neural Nucleus (Golden Amber Facets)
    const crystalGeom = new THREE.IcosahedronGeometry(0.96, 1);
    const crystalMat = new THREE.MeshPhongMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      specular: 0xfffbeb,
      shininess: 120,
      flatShading: true,
      transparent: true,
      opacity: 0.88,
    });
    const crystalMesh = new THREE.Mesh(crystalGeom, crystalMat);
    coreGroup.add(crystalMesh);

    // 5. Geodesic Policy Shield Lattice (Glowing Cyan Wireframe)
    const shieldWireGeom = new THREE.IcosahedronGeometry(1.22, 1);
    const shieldWireMat = new THREE.MeshBasicMaterial({
      color: 0x00d2fe,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const shieldWireMesh = new THREE.Mesh(shieldWireGeom, shieldWireMat);
    coreGroup.add(shieldWireMesh);

    // 6. Translucent Cybernetic Tesseract Frame (See-Through Holographic Cage)
    const tesseractGroup = new THREE.Group();
    coreGroup.add(tesseractGroup);

    const outerBoxGeom = new THREE.BoxGeometry(1.82, 1.82, 1.82);
    const outerGlassMat = new THREE.MeshPhongMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.35,
      specular: 0x38bdf8,
      shininess: 90,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerGlassBox = new THREE.Mesh(outerBoxGeom, outerGlassMat);
    tesseractGroup.add(outerGlassBox);

    const boxEdgesGeom = new THREE.EdgesGeometry(outerBoxGeom);
    const boxEdgesMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    const boxEdges = new THREE.LineSegments(boxEdgesGeom, boxEdgesMat);
    tesseractGroup.add(boxEdges);

    // Corner Vertex Energy Nodes on the Tesseract
    const vertexSphereGeom = new THREE.SphereGeometry(0.085, 12, 12);
    const vertexSphereMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
    });
    const half = 1.82 / 2;
    const corners = [
      [-half, -half, -half],
      [-half, -half, half],
      [-half, half, -half],
      [-half, half, half],
      [half, -half, -half],
      [half, -half, half],
      [half, half, -half],
      [half, half, half],
    ];
    corners.forEach(([cx, cy, cz]) => {
      const vNode = new THREE.Mesh(vertexSphereGeom, vertexSphereMat);
      vNode.position.set(cx, cy, cz);
      tesseractGroup.add(vNode);
    });

    // 7. Triple Gyroscopic Gimbal Rings (Margin Defense & Pricing Tiers)
    const ringGeom1 = new THREE.TorusGeometry(1.95, 0.032, 16, 96);
    const ringMat1 = new THREE.MeshPhongMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.65,
      shininess: 100,
    });
    const ring1 = new THREE.Mesh(ringGeom1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    scene.add(ring1);

    const ringGeom2 = new THREE.TorusGeometry(2.22, 0.026, 16, 96);
    const ringMat2 = new THREE.MeshPhongMaterial({
      color: 0x00d2fe,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      shininess: 100,
    });
    const ring2 = new THREE.Mesh(ringGeom2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    scene.add(ring2);

    const ringGeom3 = new THREE.TorusGeometry(2.46, 0.02, 16, 96);
    const ringMat3 = new THREE.MeshPhongMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      shininess: 100,
    });
    const ring3 = new THREE.Mesh(ringGeom3, ringMat3);
    ring3.rotation.x = -Math.PI / 4;
    ring3.rotation.y = Math.PI / 6;
    scene.add(ring3);

    // 8. Orbiting Diamond Policy Nodes
    const satellitesGroup = new THREE.Group();
    scene.add(satellitesGroup);

    const satCount = 8;
    const satGeom = new THREE.OctahedronGeometry(0.14, 0);
    const satMat = new THREE.MeshPhongMaterial({
      color: 0x38bdf8,
      emissive: 0x00d2fe,
      emissiveIntensity: 0.8,
      shininess: 100,
    });

    const satMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < satCount; i++) {
      const sat = new THREE.Mesh(satGeom, satMat);
      satellitesGroup.add(sat);
      satMeshes.push(sat);
    }

    // 9. Synaptic Data Particle Field
    const particleCount = 140;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const cAmber = new THREE.Color(0xf59e0b);
    const cCyan = new THREE.Color(0x00d2fe);
    const cEmerald = new THREE.Color(0x10b981);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const rad = 2.05 + Math.random() * 0.95;

      particlePositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = rad * Math.cos(phi);
      particlePositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);

      const chosen = i % 3 === 0 ? cAmber : i % 3 === 1 ? cCyan : cEmerald;
      particleColors[i * 3] = chosen.r;
      particleColors[i * 3 + 1] = chosen.g;
      particleColors[i * 3 + 2] = chosen.b;
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

    // 10. Mouse Parallax & Click Surge Interaction
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
    const onClick = () => {
      pulseBoostRef.current = 1.0;
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("click", onClick);

    // 11. Animation Loop (Paused when scrolled out of viewport)
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

      // Smooth mouse follow
      mouseX += (targetX - mouseX) * 0.08;
      mouseY += (targetY - mouseY) * 0.08;

      // Core & Crystal counter-rotations
      crystalMesh.rotation.y = elapsed * 0.45 * speedMult + mouseX * 0.6;
      crystalMesh.rotation.x = elapsed * 0.3 * speedMult + mouseY * 0.6;

      shieldWireMesh.rotation.y = -elapsed * 0.35 * speedMult;
      shieldWireMesh.rotation.z = elapsed * 0.25;

      tesseractGroup.rotation.y = elapsed * 0.22 * speedMult + mouseX * 0.4;
      tesseractGroup.rotation.x = Math.sin(elapsed * 0.35) * 0.25 + mouseY * 0.4;
      tesseractGroup.rotation.z = Math.cos(elapsed * 0.25) * 0.15;

      // Breathing pulse on inner crystal & plasma core
      const pulseScale = 1.0 + Math.sin(elapsed * 3.2) * 0.07 + pulseBoostRef.current * 0.18;
      crystalMesh.scale.set(pulseScale, pulseScale, pulseScale);
      plasmaCore.scale.set(pulseScale * 0.95, pulseScale * 0.95, pulseScale * 0.95);

      // Gyroscopic gimbal rings
      ring1.rotation.z = elapsed * 0.55 * speedMult;
      ring1.rotation.x = Math.PI / 3 + Math.sin(elapsed * 0.4) * 0.2 + mouseY * 0.3;

      ring2.rotation.z = -elapsed * 0.42 * speedMult;
      ring2.rotation.y = Math.PI / 4 + Math.cos(elapsed * 0.35) * 0.2 + mouseX * 0.3;

      ring3.rotation.z = elapsed * 0.3 * speedMult;
      ring3.rotation.x = -Math.PI / 4 + Math.sin(elapsed * 0.25) * 0.15;

      // Orbiting diamond policy satellites
      satMeshes.forEach((sat, i) => {
        const angle = (i / satCount) * Math.PI * 2 + elapsed * 0.5;
        const radius = 2.2 + Math.sin(elapsed * 1.8 + i) * 0.15;
        sat.position.x = Math.cos(angle) * radius;
        sat.position.z = Math.sin(angle) * radius;
        sat.position.y = Math.sin(angle * 2.0 + elapsed) * 0.45;
        sat.rotation.y = elapsed * 2.0;
        sat.rotation.x = elapsed * 1.5;
      });

      // Particle field rotation
      particles.rotation.y = elapsed * 0.14 * speedMult;
      particles.rotation.x = Math.sin(elapsed * 0.15) * 0.1;

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
      plasmaGeom.dispose();
      plasmaMat.dispose();
      crystalGeom.dispose();
      crystalMat.dispose();
      shieldWireGeom.dispose();
      shieldWireMat.dispose();
      outerBoxGeom.dispose();
      outerGlassMat.dispose();
      boxEdgesGeom.dispose();
      boxEdgesMat.dispose();
      vertexSphereGeom.dispose();
      vertexSphereMat.dispose();
      ringGeom1.dispose();
      ringMat1.dispose();
      ringGeom2.dispose();
      ringMat2.dispose();
      ringGeom3.dispose();
      ringMat3.dispose();
      satGeom.dispose();
      satMat.dispose();
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
      title="Interactive 3D EDITH Neural Core — Hover to rotate, Click to pulse"
    />
  );
}
