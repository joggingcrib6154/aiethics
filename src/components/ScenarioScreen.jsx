import React, { useState, Suspense } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import { useSpring, animated } from "@react-spring/three";
import { Text, OrbitControls } from "@react-three/drei";


function Door({ choice, index, onClick }) {
  const [hovered, setHovered] = useState(false);
  const texture = useLoader(TextureLoader, "/textures/wood.jpg");

  const { rotation } = useSpring({
    rotation: hovered ? [0, -Math.PI / 2, 0] : [0, 0, 0],rotation: hovered ? [0, -Math.PI * (165 / 180), 0] : [0, 0, 0],
    config: { mass: 1, tension: 240, friction: 22 },
  });

  return (
    <group position={[index * 4.5 - 4.5, 0, 0]}>
      <mesh
        position={[0.6, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onClick(index)}
        visible={false}
      >
        <boxGeometry args={[1.2, 2.5, 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <Text
        position={[0.8, 0, -0.25]}
        fontSize={0.25}
        maxWidth={1.4}
        color="white"
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {choice.text}
      </Text>

      <animated.group rotation={rotation}>
        <mesh position={[0.8, 0, 0]} castShadow>
        <boxGeometry args={[1.6, 3.2, 0.1]} />
        <meshStandardMaterial map={texture} />
        </mesh>
      </animated.group>
    </group>
  );
}



export default function ScenarioScreen({ scenario, onChoice }) {
  return (
    <div style={{ width: "100%", height: "60vh" }}>
      <h2 className="text-2xl font-bold text-center mb-2">{scenario.title}</h2>
      <p className="text-lg text-center mb-4">{scenario.description}</p>

      <Canvas shadows camera={{ position: [0, 2, 6], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <Suspense fallback={null}>
          {scenario.choices.map((choice, i) => (
            <Door key={i} index={i} choice={choice} onClick={onChoice} />
          ))}
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
}
