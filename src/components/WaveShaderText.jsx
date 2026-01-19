import { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function WaveShaderText({ 
  text, 
  position, 
  fontSize = 0.1, 
  maxWidth = 8,
  anchorX = "center",
  anchorY = "middle",
  renderOrder = 10,
  depthTest = false,
  depthWrite = false
}) {
  const textRef = useRef();

  useFrame((state) => {
    if (textRef.current) {
      const time = state.clock.elapsedTime;
      
      // Create wave effect - multiple sine waves for wave-like motion
      const wave1 = Math.sin(time * 2.0) * 0.5 + 0.5;
      const wave2 = Math.sin(time * 1.5 + 1.0) * 0.5 + 0.5;
      const wave3 = Math.sin(time * 2.5 + 2.0) * 0.5 + 0.5;
      
      // Combine waves for more organic wave movement
      const wave = (wave1 + wave2 + wave3) / 3;
      
      // Add pulsing effect
      const pulse = Math.sin(time * 1.2) * 0.15 + 0.85;
      
      // Create wave-like color transition
      const cyan = new THREE.Color(0.0, 0.8, 0.9); // Bright cyan
      const purple = new THREE.Color(0.6, 0.3, 0.9); // Purple
      const pink = new THREE.Color(0.9, 0.4, 0.7); // Pink
      
      // Wave through colors
      let finalColor;
      if (wave < 0.33) {
        finalColor = cyan.clone().lerp(purple, wave * 3);
      } else if (wave < 0.66) {
        finalColor = purple.clone().lerp(pink, (wave - 0.33) * 3);
      } else {
        finalColor = pink.clone().lerp(cyan, (wave - 0.66) * 3);
      }
      
      // Apply pulse
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
