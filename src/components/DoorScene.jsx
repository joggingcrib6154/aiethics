import React, { useState } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';

function Door({ position = [0, 0, 0], onClick }) {
  const [hovered, setHovered] = useState(false);
  const texture = useLoader(THREE.TextureLoader, '/textures/wood.jpg');

  const { rotation } = useSpring({
    rotation: hovered ? [0, -0.3, 0] : [0, 0, 0],
    config: { mass: 1, tension: 180, friction: 18 },
  });

  return (
    <a.group
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >

      <mesh castShadow>
        <boxGeometry args={[2, 4, 0.3]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

    
      <mesh position={[0.9, 0, 0.2]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#222" metalness={1} roughness={0.4} />
      </mesh>
    </a.group>
  );
}

export default function DoorScene({ onChoice }) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        <pointLight position={[-5, -5, 5]} intensity={0.6} />
        <Door position={[-3, 0, 0]} onClick={() => onChoice(0)} />
        <Door position={[0, 0, 0]} onClick={() => onChoice(1)} />
        <Door position={[3, 0, 0]} onClick={() => onChoice(2)} />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
