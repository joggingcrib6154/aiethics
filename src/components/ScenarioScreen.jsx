import React, { useState, useRef, Suspense } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3 } from "three";
import { animated, useSpring } from "@react spring/three";
import { Text } from "@react-three/drei";

function Door({ index, originalPosition, isSolo, choice, onClick, clickedIndex, hoveredIndex, setHoveredIndex }) {
  const texture = useLoader(TextureLoader, "/aiethics/textures/wood.jpg");

  const isClicked = clickedIndex === index;
  const isHovered = hoveredIndex === index;

  const { rotation } = useSpring({
    rotation: isClicked ? [0, -3.1, 0] : isHovered ? [0, -2.88, 0] : [0, 0, 0],
    config: { mass: 1, tension: 180, friction: 20 },
  });

  const position = isSolo ? [0, 0, 0] : originalPosition;

  return (
    <group position={position}>
      <Text
        position={[0, 0, -0.3]}
        fontSize={0.25}
        color="white"
        maxWidth={1.2}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {choice.text}
      </Text>

      <animated.group
        rotation={rotation}
        position={[0, 0, 0.05]}
      >
        <mesh
          position={[0, 0, 0]}
          castShadow
          onClick={() => onClick(index)}
          onPointerOver={() => setHoveredIndex(index)}
          onPointerOut={() => setHoveredIndex(null)}
        >
          <boxGeometry args={[1.2, 2.4, 0.1]} />
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
  const targetRef = useRef(null);
  const resetRef = useRef(false);

  const defaultPosition = new Vector3(0, 0, 6);
  const defaultLookAt = new Vector3(0, 0, 0);

  const positions = [
    [-4.5, 0, 0.05],
    [0, 0, 0.05],
    [4.5, 0, 0.05],
  ];

  const targets = [
    new Vector3(-4.5, 0, -1),
    new Vector3(0, 0, -1),
    new Vector3(4.5, 0, -1),
  ];

  useFrame(() => {
    if (clicked !== null && directionRef.current && targetRef.current) {
      const speed = 0.08;
      const moveVec = directionRef.current.clone().multiplyScalar(speed);
      camera.position.add(moveVec);

      camera.lookAt(targetRef.current);

      const distance = camera.position.distanceTo(targetRef.current);
      if (distance < 0.3 && !flash) {
        setFlash(true);
        setTimeout(() => {
          resetRef.current = true;
          setFlash(false);
          setClicked(null);
          directionRef.current = null;
          targetRef.current = null;
          onFinish(clicked);
        }, 150);
      }
    }

    if (resetRef.current) {
      camera.position.lerp(defaultPosition, 0.15);
      const to = defaultLookAt.clone().sub(camera.position).normalize();
      const lookTarget = camera.position.clone().add(to);
      camera.lookAt(lookTarget);

      const distance = camera.position.distanceTo(defaultPosition);
      if (distance < 0.05) {
        camera.position.copy(defaultPosition);
        camera.lookAt(defaultLookAt);
        resetRef.current = false;
      }
    }
  });

  const handleClick = (i) => {
    setClicked(i);
    const doorX = positions[i][0];
    const target = new Vector3(doorX, 0, -1);
    const dir = target.clone().sub(camera.position).normalize();
    targetRef.current = target;
    directionRef.current = dir;
  };

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />

      <Text position={[0, 2.8, -2]} fontSize={0.35} color="white" anchorX="center" anchorY="middle">
        {scenario.title}
      </Text>
      <Text position={[0, 2.4, -2]} fontSize={0.2} maxWidth={6} color="white" anchorX="center" anchorY="middle">
        {scenario.description}
      </Text>

      {scenario.choices.map((choice, i) => {
        if (clicked !== null && clicked !== i) return null;

        return (
          <Door
            key={i}
            index={i}
            originalPosition={positions[i]}
            isSolo={clicked === i}
            choice={choice}
            onClick={handleClick}
            clickedIndex={clicked}
            hoveredIndex={hovered}
            setHoveredIndex={setHovered}
          />
        );
      })}

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
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
      <Canvas shadows camera={{ position: [0, 0, 6], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene scenario={scenario} onFinish={onChoice} />
        </Suspense>
      </Canvas>
    </div>
  );
}