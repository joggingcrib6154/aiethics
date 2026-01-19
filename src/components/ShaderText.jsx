import { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ShaderText({ 
  text, 
  position, 
  fontSize = 0.136, 
  maxWidth = 0.9, 
  lineHeight = 1.44,
  textAlign = "center",
  anchorX = "center",
  anchorY = "middle",
  renderOrder = 10,
  depthTest = false,
  depthWrite = false
}) {
  const textRef = useRef();
  const noiseOffset = useRef(Math.random() * 100); // Unique offset for each text instance

  useFrame((state) => {
    if (textRef.current) {
      const time = state.clock.elapsedTime;
      
      // Create wave effect - multiple sine waves for more complex movement
      const wave1 = Math.sin(time * 1.5 + noiseOffset.current) * 0.5 + 0.5;
      const wave2 = Math.sin(time * 2.3 + 1.0 + noiseOffset.current) * 0.5 + 0.5;
      const wave3 = Math.sin(time * 0.8 + 2.0 + noiseOffset.current) * 0.5 + 0.5;
      
      // Combine waves for more organic movement
      const wave = (wave1 + wave2 + wave3) / 3;
      
      // Add subtle pulsing effect
      const pulse = Math.sin(time * 0.5) * 0.1 + 0.9;
      
      const beige = new THREE.Color(0.96, 0.87, 0.70); // Warm beige
      const emerald = new THREE.Color(0.314, 0.784, 0.471); // Emerald green
      const gold = new THREE.Color(0.85, 0.65, 0.13); // Gold accent
      
      // Wave washes from beige to emerald and back, with occasional gold highlights
      const baseColor = beige.clone().lerp(emerald, wave);
      const finalColor = baseColor.clone().lerp(gold, Math.sin(time * 0.3) * 0.15 + 0.15);
      finalColor.multiplyScalar(pulse);
      
      textRef.current.color = finalColor;
    }
  });

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={fontSize}
      maxWidth={maxWidth}
      lineHeight={lineHeight}
      textAlign={textAlign}
      anchorX={anchorX}
      anchorY={anchorY}
      renderOrder={renderOrder}
      depthTest={depthTest}
      depthWrite={depthWrite}
    >
      {text}
    </Text>
  );
}
