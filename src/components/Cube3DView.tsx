/**
 * Cube3DView.tsx
 * Three.js 4x4x4 Rubik's Revenge Interactive 3D Canvas
 * Renders 64 cubies with live sticker colors, OrbitControls (drag to rotate, scroll to zoom),
 * and GLTFExporter export button to download a real 3D model (.glb file).
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Download, RotateCcw, Box, Check, Loader2 } from 'lucide-react';
import { CubeColor, CubeState, CUBE_COLORS } from '../types';

interface Cube3DViewProps {
  cubeState: CubeState;
  isAnimating?: boolean;
  compact?: boolean;
}

export const Cube3DView: React.FC<Cube3DViewProps> = ({ cubeState, compact = false }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Helper to map CubeColor to THREE.Color
  const getThreeColor = (color: CubeColor): number => {
    switch (color) {
      case 'W': return 0xffffff;
      case 'Y': return 0xfacc15;
      case 'R': return 0xef4444;
      case 'O': return 0xf97316;
      case 'B': return 0x2563eb;
      case 'G': return 0x16a34a;
      default: return 0x1e293b;
    }
  };

  const plasticColor = 0x111827; // Dark premium plastic body

  // Re-build or update 3D cube mesh whenever cubeState changes
  const buildCubeMeshes = (group: THREE.Group, state: CubeState) => {
    // Clear old children
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
      group.remove(child);
    }

    const cubieSize = 0.92;
    const spacing = 1.0;
    const offset = 1.5; // Positions: -1.5, -0.5, 0.5, 1.5
    const geometry = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);

    // Coordinate system:
    // X+: Right (R), X-: Left (L)
    // Y+: Up (U),    Y-: Down (D)
    // Z+: Front (F), Z-: Back (B)
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = 0; z < 4; z++) {
          // Check if cubie is on the surface (at least one coord is 0 or 3)
          if (x === 0 || x === 3 || y === 0 || y === 3 || z === 0 || z === 3) {
            // Three.js BoxGeometry material order: [px, nx, py, ny, pz, nz]
            // px = R, nx = L, py = U, ny = D, pz = F, nz = B
            const mats: THREE.MeshStandardMaterial[] = [];

            // 1. px = Right face (x === 3)
            if (x === 3) {
              const row = 3 - y;
              const col = 3 - z;
              const sticker = state.R[row * 4 + col];
              mats.push(new THREE.MeshStandardMaterial({
                color: getThreeColor(sticker.color),
                roughness: 0.25,
                metalness: 0.1,
              }));
            } else {
              mats.push(new THREE.MeshStandardMaterial({ color: plasticColor, roughness: 0.8 }));
            }

            // 2. nx = Left face (x === 0)
            if (x === 0) {
              const row = 3 - y;
              const col = z;
              const sticker = state.L[row * 4 + col];
              mats.push(new THREE.MeshStandardMaterial({
                color: getThreeColor(sticker.color),
                roughness: 0.25,
                metalness: 0.1,
              }));
            } else {
              mats.push(new THREE.MeshStandardMaterial({ color: plasticColor, roughness: 0.8 }));
            }

            // 3. py = Up face (y === 3)
            if (y === 3) {
              const row = 3 - z;
              const col = x;
              const sticker = state.U[row * 4 + col];
              mats.push(new THREE.MeshStandardMaterial({
                color: getThreeColor(sticker.color),
                roughness: 0.25,
                metalness: 0.1,
              }));
            } else {
              mats.push(new THREE.MeshStandardMaterial({ color: plasticColor, roughness: 0.8 }));
            }

            // 4. ny = Down face (y === 0)
            if (y === 0) {
              const row = z;
              const col = x;
              const sticker = state.D[row * 4 + col];
              mats.push(new THREE.MeshStandardMaterial({
                color: getThreeColor(sticker.color),
                roughness: 0.25,
                metalness: 0.1,
              }));
            } else {
              mats.push(new THREE.MeshStandardMaterial({ color: plasticColor, roughness: 0.8 }));
            }

            // 5. pz = Front face (z === 3)
            if (z === 3) {
              const row = 3 - y;
              const col = x;
              const sticker = state.F[row * 4 + col];
              mats.push(new THREE.MeshStandardMaterial({
                color: getThreeColor(sticker.color),
                roughness: 0.25,
                metalness: 0.1,
              }));
            } else {
              mats.push(new THREE.MeshStandardMaterial({ color: plasticColor, roughness: 0.8 }));
            }

            // 6. nz = Back face (z === 0)
            if (z === 0) {
              const row = 3 - y;
              const col = 3 - x;
              const sticker = state.B[row * 4 + col];
              mats.push(new THREE.MeshStandardMaterial({
                color: getThreeColor(sticker.color),
                roughness: 0.25,
                metalness: 0.1,
              }));
            } else {
              mats.push(new THREE.MeshStandardMaterial({ color: plasticColor, roughness: 0.8 }));
            }

            const mesh = new THREE.Mesh(geometry, mats);
            mesh.position.set((x - offset) * spacing, (y - offset) * spacing, (z - offset) * spacing);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
          }
        }
      }
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(6.5, 5.5, 7.5);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 20;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight1.position.set(8, 12, 10);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.9);
    dirLight2.position.set(-10, -6, -8);
    scene.add(dirLight2);

    // 6. Cube Root Group
    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);
    cubeGroupRef.current = cubeGroup;

    buildCubeMeshes(cubeGroup, cubeState);

    // 7. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update cube whenever cubeState changes
  useEffect(() => {
    if (cubeGroupRef.current) {
      buildCubeMeshes(cubeGroupRef.current, cubeState);
    }
  }, [cubeState]);

  // Reset Camera View
  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(6.5, 5.5, 7.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  // Export 3D Model as .glb using THREE.GLTFExporter
  const handleDownloadGLB = () => {
    if (!cubeGroupRef.current) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const exporter = new GLTFExporter();
      exporter.parse(
        cubeGroupRef.current,
        (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'rubiks_revenge_4x4_cube.glb';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          setIsExporting(false);
          setExportSuccess(true);
          setTimeout(() => setExportSuccess(false), 3000);
        },
        (error) => {
          console.error('Error exporting 3D model:', error);
          setIsExporting(false);
        },
        { binary: true }
      );
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  return (
    <div
      id="cube-3d-wrapper"
      className={`relative w-full ${
        compact ? 'h-[220px] sm:h-[260px]' : 'h-[240px] sm:h-[320px] lg:h-[380px]'
      } bg-slate-950/80 border border-slate-800/90 rounded-2xl overflow-hidden shadow-xl flex flex-col`}
    >
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-pan-y" />

      {/* Floating 3D Control overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 pointer-events-auto shadow-sm">
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-bold text-slate-200">Interactive 4x4 Model</span>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Reset Camera */}
          <button
            id="reset-camera-btn"
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md text-slate-300 hover:text-white border border-slate-800 shadow-sm transition-colors"
            title="Reset Camera Angle"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Download GLB Button */}
          <button
            id="download-glb-btn"
            onClick={handleDownloadGLB}
            disabled={isExporting}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg backdrop-blur-md text-[11px] font-bold shadow-sm transition-all ${
              exportSuccess
                ? 'bg-emerald-600 text-white border border-emerald-500'
                : 'bg-slate-900/90 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-800 hover:border-blue-500'
            }`}
            title="Download 3D Model (.glb)"
          >
            {isExporting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : exportSuccess ? (
              <Check className="w-3 h-3" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            <span>{exportSuccess ? 'Downloaded!' : '.GLB'}</span>
          </button>
        </div>
      </div>

      {/* Orbit Tip overlay */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-slate-800/80 pointer-events-none text-[10px] sm:text-[11px] text-slate-400 select-none whitespace-nowrap">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
};
