import React, { useState, useRef, Suspense, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3 } from "three";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { useTransition } from "@react-spring/three";
import { Text } from "@react-three/drei";
import MaskGrid from "./MaskGrid";
import WormholeEffect from "./DoorShaders";
import BackgroundShader from "./BackgroundShaders";

function ShaderTextPlane({ text, position }) {
  const textRef = useRef();
  const timeRef = useRef(0);
  const noiseOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;

    if (textRef.current) {
      const time = timeRef.current * 0.2;
      const uv = 0.5;

      const movement = time * 0.1;
      const freq1 = 3.0;
      const freq2 = 2.0;

      const noise1 = (Math.sin((uv + movement + noiseOffset) * freq1 * 2) +
        Math.sin((uv + movement + noiseOffset) * freq1 * 3.1) +
        Math.sin((uv + movement + noiseOffset) * freq1 * 5.7)) / 3;

      const noise2 = (Math.sin((uv - movement + noiseOffset) * freq2 * 2 + noise1 * 0.3) +
        Math.sin((uv - movement + noiseOffset) * freq2 * 3.1 + noise1 * 0.3) +
        Math.sin((uv - movement + noiseOffset) * freq2 * 5.7 + noise1 * 0.3)) / 3;

      const t = (noise2 + 1) / 2;

      const beige = new THREE.Color(0.96, 0.87, 0.70);
      const emerald = new THREE.Color(0.314, 0.784, 0.471);

      const finalColor = beige.clone().lerp(emerald, t);

      const brightness = 1.0 + noise1 * 0.1;
      finalColor.multiplyScalar(brightness);

      textRef.current.color = finalColor;
    }
  });

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={0.116}
      maxWidth={0.7}
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

function Door({ index, position, choice, onClick, isClicked, isHovered, setHovered, doorRef, totalChoices }) {
  const texture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/textures/bluewood.jpg`);
  const groupRef = useRef();
  const isRightmost = totalChoices != null && index === totalChoices - 1;
  const textX = isRightmost ? 0.88 : 0.72;

  const { pos, rot } = useSpring({
    pos: isClicked ? position : [position[0] * 0.8, position[1], position[2] * 0.8],
    rot: isClicked ? [0, -3.1, 0] : isHovered ? [0, -2.88, 0] : [0, 0, 0],
    config: { mass: 1, tension: 180, friction: 20 },
  });

  return (
    <animated.group ref={(node) => {
      groupRef.current = node;
      if (doorRef) doorRef(node);
    }} position={pos}>
      <ShaderTextPlane text={choice.text} position={[textX, 0, -0.3]} />

      <mesh
        position={[0.48, 0, 0.05]}
        onClick={() => onClick(index)}
        onPointerOver={() => setHovered(index)}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[1.3, 2.6, 0.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <animated.group rotation={rot}>
        <mesh position={[0.48, 0, 0]}>
          <boxGeometry args={[1.45, 2.9, 0.1]} />
          <meshStandardMaterial map={texture} />
        </mesh>
      </animated.group>
    </animated.group>
  );
}

function Scene({ scenario, onFinish, doorRefs }) {
  const [clicked, setClicked] = useState(null);
  const [hovered, setHovered] = useState(null);

  const spacing = 3.6;
  const y = -2.8;

  const originalDoorPositions = scenario.choices.map((_, i) => {
    const total = scenario.choices.length;
    const x = i * spacing - ((total - 1) * spacing) / 2 - 0.4;
    return [x, y, 0];
  });

  function handleDoorClick(i) {
    if (clicked === null) {
      setClicked(i);
      setTimeout(() => {
        if (typeof onFinish === "function") onFinish(i);
      }, 500);
    }
  }

  return (
    <group renderOrder={5}>
      <Text
        position={[0, 0.72, -2]}
        fontSize={0.28}
        color="white"
        anchorX="center"
        anchorY="middle"
        renderOrder={5}
        depthTest={false}
        depthWrite={false}
      >
        {scenario.title}
      </Text>
      <Text
        position={[0, 0.12, -2]}
        fontSize={0.16}
        maxWidth={6}
        color="white"
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        renderOrder={5}
        depthTest={false}
        depthWrite={false}
      >
        {scenario.description}
      </Text>

      {scenario.choices.map((choice, i) => {
        return (
          <Door
            key={i}
            index={i}
            position={originalDoorPositions[i]}
            choice={choice}
            onClick={(index) => {
              handleDoorClick(index);
            }}
            isClicked={clicked === i}
            isHovered={hovered === i}
            setHovered={setHovered}
            doorRef={(el) => (doorRefs.current[i] = el)}
            totalChoices={scenario.choices.length}
          />
        );
      })}
    </group>
  );
}

function TransitionManager({ scenario, onFinish, doorRefs, direction }) {
  const transitions = useTransition(scenario, {
    keys: s => s.title,
    from: { position: [direction * 15, 0, 0] },
    enter: { position: [0, 0, 0] },
    leave: { position: [-direction * 15, 0, 0] },
    config: { tension: 120, friction: 20 },
  });

  return transitions((style, item) => (
    <animated.group position={style.position}>
      <Scene scenario={item} onFinish={onFinish} doorRefs={doorRefs} />
    </animated.group>
  ));
}

function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, -2.2, 0);
  }, [camera]);
  return null;
}

export default function ScenarioScene({ scenario, choices, onChoice, direction, onNavigate }) {
  const doorRefs = useRef([]);
  const cooldownRef = useRef(false);
  const touchStartXRef = useRef(null);

  // Cooldown helper to avoid rapid-fire navigation
  function fireNavigate(dir) {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    onNavigate && onNavigate(dir);
    setTimeout(() => { cooldownRef.current = false; }, 600);
  }

  function handleWheel(e) {
    // Only react to horizontal scroll (trackpad swipe or shift+scroll)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 40) fireNavigate(1);      // swipe left → go forward (right)
      else if (e.deltaX < -40) fireNavigate(-1); // swipe right → go back (left)
    }
  }

  function handleTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (dx < -60) fireNavigate(1);    // swipe left → forward
    else if (dx > 60) fireNavigate(-1); // swipe right → back
  }

  return (
    <div
      style={{ width: "100vw", height: "100vh", position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Canvas
        frameloop="always"
        shadows
        camera={{ position: [0, -2.2, 6], fov: 52 }}
        style={{ pointerEvents: "auto", width: "100%", height: "100%" }}
      >
        <CameraController />
        <Suspense fallback={null}>
          <BackgroundShader visible={true} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />

          <TransitionManager
            scenario={scenario}
            onFinish={onChoice}
            doorRefs={doorRefs}
            direction={direction || 1}
          />
        </Suspense>
      </Canvas>
      <MaskGrid choices={choices} />
    </div>
  );
}
