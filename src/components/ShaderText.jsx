import { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ShaderText({ text, position }) {
  const textRef = useRef();

  useFrame((state) => {
    if (textRef.current) {
      const time = state.clock.elapsedTime;
      
      // Create wave effect - multiple sine waves for more complex movement
      const wave1 = Math.sin(time * 1.5) * 0.5 + 0.5;
      const wave2 = Math.sin(time * 2.3 + 1.0) * 0.5 + 0.5;
      const wave3 = Math.sin(time * 0.8 + 2.0) * 0.5 + 0.5;
      
      // Combine waves for more organic movement
      const wave = (wave1 + wave2 + wave3) / 3;
      
      const beige = new THREE.Color(0.96, 0.87, 0.70); // Warm beige
      const emerald = new THREE.Color(0.314, 0.784, 0.471); // Emerald green
      
      // Wave washes from beige to emerald and back
      textRef.current.color = beige.clone().lerp(emerald, wave);
    }
  });

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={0.136}
      maxWidth={0.9}
      lineHeight={1.44}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      renderOrder={10}
      depthTest={false}
      depthWrite={false}
    >
      {text}
    </Text>
  );
}
