"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function SpireCore() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;

    group.current.rotation.y =
      state.clock.elapsedTime * 0.35;

    group.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.4) * 0.12;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.9, 0]}>
        <coneGeometry args={[0.72, 1.9, 5]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={1.8}
          metalness={0.85}
          roughness={0.18}
        />
      </mesh>

      <mesh position={[0, -0.45, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.72, 1.9, 5]} />
        <meshStandardMaterial
          color="#67e8f9"
          emissive="#22d3ee"
          emissiveIntensity={1.6}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      <mesh>
        <octahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial
          color="#0f172a"
          emissive="#0891b2"
          emissiveIntensity={0.55}
          metalness={1}
          roughness={0.08}
          transparent
          opacity={0.92}
        />
      </mesh>

      <mesh rotation={[0.6, 0.8, 0.2]}>
        <torusGeometry args={[1.18, 0.012, 12, 96]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>

      <mesh rotation={[1.2, -0.4, 0.8]}>
        <torusGeometry args={[1.42, 0.009, 12, 96]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
    </group>
  );
}

export default function ArtifactRuntime() {
  return (
    <div className="relative h-[360px] overflow-hidden border border-cyan-300/20 bg-black shadow-[0_0_80px_rgba(34,211,238,0.18)]">
      <div className="absolute left-4 top-4 z-10 border border-white/10 bg-black/60 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-cyan-100 backdrop-blur-xl">
        3D ARTIFACT RUNTIME
      </div>

      <div className="absolute bottom-4 right-4 z-10 border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-cyan-100 backdrop-blur-xl">
        SPIRE CORE ONLINE
      </div>

      <Canvas camera={{ position: [0, 0.25, 5], fov: 45 }}>
        <color attach="background" args={["#000000"]} />

        <ambientLight intensity={0.35} />

        <pointLight
          position={[2.5, 3, 3]}
          intensity={7}
          color="#67e8f9"
        />

        <pointLight
          position={[-3, -2, -2]}
          intensity={3}
          color="#1d4ed8"
        />

        <Stars
          radius={80}
          depth={40}
          count={1400}
          factor={3}
          saturation={0}
          fade
          speed={0.6}
        />

        <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.7}>
          <SpireCore />
        </Float>
      </Canvas>
    </div>
  );
}
