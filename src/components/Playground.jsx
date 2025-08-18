import React, { useRef, useEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Box } from "@react-three/drei";
import { Matrix4 } from "three";

function Cube() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshNormalMaterial />
    </mesh>
  );
}

function CustomPerspectiveController() {
  const { camera } = useThree();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    const pulse = 50 + Math.sin(t * 4) * 5;
    camera.fov = pulse;

    camera.rotation.y = Math.sin(t * 0.5) * 0.1;

    camera.position.z = 5 + Math.sin(t * 2) * 0.2;

    camera.updateProjectionMatrix();
  });

  return null;
}

export default function PerspectivePlayground() {
  return (
    <div style={{ width: "100vw", height: "100vh", filter: "blur(1px)" }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <CustomPerspectiveController />
        <Cube />
      </Canvas>
    </div>
  );
}