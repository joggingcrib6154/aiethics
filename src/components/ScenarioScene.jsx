import React, { useState, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3, Quaternion } from "three";
import { animated, useSpring } from "@react-spring/three";
import { Text } from "@react-three/drei";

function Door({ index, choice, onClick, clickedIndex, hoveredIndex, setHoveredIndex }) {
  const texture = useLoader(TextureLoader, "/textures/wood.jpg");
  const isClicked = clickedIndex === index;
  const isHovered = hoveredIndex === index;

  const { rotation } = useSpring({
    rotation: isClicked ? [0, -3.1, 0] : isHovered ? [0, -2.88, 0] : [0, 0, 0],
    config: { mass: 1, tension: 180, friction: 20 },
  });

  return (
    <group position={[index * 4.5 - 4.5, 0, 0]}>
      <Text
        position={[0.8, 0, -0.3]}
        fontSize={0.25}
        color="white"
        maxWidth={1.4}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {choice.text}
      </Text>

      <mesh
        position={[0.8, 0, 0.05]}
        onClick={() => onClick(index)}
        onPointerOver={() => setHoveredIndex(index)}
        onPointerOut={() => setHoveredIndex(null)}
      >
        <boxGeometry args={[1.6, 3.2, 0.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <animated.group rotation={rotation}>
        <mesh position={[0.8, 0, 0]} castShadow>
          <boxGeometry args={[1.6, 3.2, 0.1]} />
          <meshStandardMaterial map={texture} />
        </mesh>
      </animated.group>
    </group>
  );
}

function Scene({ scenario, onFinish }) {
  const { camera } = useThree();
  const [clicked, setClicked] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [flash, setFlash] = useState(false);

  const directionRef = useRef(null);
  const rotationRef = useRef(null);
  const targetRef = useRef(null);

  useFrame(() => {
    if (clicked !== null && directionRef.current && rotationRef.current && targetRef.current) {
      camera.position.addScaledVector(directionRef.current, 0.2);
      camera.quaternion.copy(rotationRef.current);

      const distance = camera.position.distanceTo(targetRef.current);
      if (distance < 0.3 && !flash) {
        setFlash(true);
        setTimeout(() => {
          setFlash(false);
          setClicked(null);
          camera.position.set(0, 1.6, 6);
          camera.lookAt(0, 1.6, 0);
          directionRef.current = null;
          rotationRef.current = null;
          targetRef.current = null;
          onFinish(clicked);
        }, 150);
      }
    }
  });

  const handleClick = (i) => {
    setClicked(i);

    const doorX = i * 4.5 - 4.5 + 0.8;
    const doorY = 1.6;
    const doorZ = 0;

    const doorVec = new Vector3(doorX, doorY, doorZ);
    targetRef.current = doorVec;

    const direction = doorVec.clone().sub(camera.position).normalize();
    directionRef.current = direction;

    const tempCam = camera.clone();
    tempCam.lookAt(doorVec);
    rotationRef.current = tempCam.quaternion.clone();
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

      {scenario.choices.map((choice, i) => (
        <Door
          key={i}
          index={i}
          choice={choice}
          onClick={handleClick}
          clickedIndex={clicked}
          hoveredIndex={hovered}
          setHoveredIndex={setHovered}
        />
      ))}

      {flash && (
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color="white" />
        </mesh>
      )}
    </>
  );
}

export default function ScenarioScene({ scenario, onChoice }) {
  return (
    <div style={{ width: "100%", height: "60vh" }}>
      <h2 className="text-2xl font-bold text-center mb-2">{scenario.title}</h2>
      <p className="text-lg text-center mb-4">{scenario.description}</p>

      <Canvas shadows camera={{ position: [0, 1.6, 6], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene scenario={scenario} onFinish={onChoice} />
        </Suspense>
      </Canvas>
    </div>
  );
}
