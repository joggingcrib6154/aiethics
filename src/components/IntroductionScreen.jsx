import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import BackgroundShaders from './BackgroundShaders';
import WaveShaderText from './WaveShaderText';
import { motion } from 'framer-motion';

function StartButton3D({ onStart }) {
  return (
    <group position={[0, -1.5, 0]}>
      <mesh
        onClick={onStart}
        onPointerOver={(e) => {
          e.stopPropagation();
          e.object.scale.set(1.1, 1.1, 1.1);
        }}
        onPointerOut={(e) => {
          e.object.scale.set(1, 1, 1);
        }}
      >
        <planeGeometry args={[3.2, 1.0]} />
        <meshBasicMaterial 
          transparent 
          opacity={0.7}
          color={0x000000}
        />
      </mesh>
      {/* Border outline */}
      <group position={[0, 0, 0.005]}>
        {/* Top border */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[3.2, 0.1, 0.01]} />
          <meshBasicMaterial color={0x00ffff} transparent opacity={1.0} />
        </mesh>
        {/* Bottom border */}
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[3.2, 0.1, 0.01]} />
          <meshBasicMaterial color={0x00ffff} transparent opacity={1.0} />
        </mesh>
        {/* Left border */}
        <mesh position={[-1.6, 0, 0]}>
          <boxGeometry args={[0.1, 1.0, 0.01]} />
          <meshBasicMaterial color={0x00ffff} transparent opacity={1.0} />
        </mesh>
        {/* Right border */}
        <mesh position={[1.6, 0, 0]}>
          <boxGeometry args={[0.1, 1.0, 0.01]} />
          <meshBasicMaterial color={0x00ffff} transparent opacity={1.0} />
        </mesh>
      </group>
      <WaveShaderText
        text="Begin Your Journey"
        position={[0, 0, 0.01]}
        fontSize={0.18}
        anchorX="center"
        anchorY="middle"
        renderOrder={10}
        depthTest={false}
        depthWrite={false}
      />
    </group>
  );
}

export default function IntroductionScreen({ onStart }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100 }}>
      <Canvas style={{ position: 'absolute', top: 0, left: 0 }} camera={{ position: [0, 0, 5], fov: 50 }}>
        <Suspense fallback={null}>
          <BackgroundShaders />
          <StartButton3D onStart={onStart} />
        </Suspense>
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          width: '90%',
          maxWidth: '800px',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            fontSize: '3.5rem',
            color: 'white',
            textShadow: '0 0 24px rgba(0,255,200,0.25)',
            marginBottom: '1.5rem',
            fontWeight: 700,
            pointerEvents: 'none'
          }}
        >
          AI Ethics Journey
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            fontSize: '1.2rem',
            color: 'rgba(255, 255, 255, 0.9)',
            lineHeight: '1.8',
            marginBottom: '2rem',
            textShadow: '0 0 12px rgba(0,0,0,0.4)',
            pointerEvents: 'none'
          }}
        >
          <p style={{ marginBottom: '1.5rem' }}>
            Welcome to an interactive exploration of AI ethics. You'll be presented with 20 scenarios where AI technology intersects with your daily life.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            Behind each door lies a choice. Hover over the doors to peek inside, then swing them open to make your decision.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            Each choice you make reveals a fragment of a mask in the top right corner. As you progress, watch your mask take shape.
          </p>
          <p>
            At the end, you'll discover your AI ethics archetype, receive personalized feedback on your ethical approach, and be able to download your completed mask.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
