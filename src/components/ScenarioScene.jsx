import React, { useState, useRef, Suspense, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3 } from "three";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { useTransition } from "@react-spring/three";
import { Text } from "@react-three/drei";
import MaskGrid from "./MaskGrid";
import BackgroundShader from "./BackgroundShaders";

// ─── Easing ──────────────────────────────────────────────────────────────────
function easeInOutQuint(t) {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

// ─── Shader Text on Doors ────────────────────────────────────────────────────
function ShaderTextPlane({ text, position }) {
  const textRef = useRef();
  const noiseOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state) => {
    if (!textRef.current) return;
    const time = state.clock.elapsedTime * 0.2;
    const uv = 0.5;
    const movement = time * 0.1;
    const freq1 = 3.0, freq2 = 2.0;
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
    finalColor.multiplyScalar(1.0 + noise1 * 0.1);
    textRef.current.color = finalColor;
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

// ─── Interactive Door ────────────────────────────────────────────────────────
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

// ─── Placeholder (next scene preview inside zoom) ───────────────────────────
function PlaceholderDoor({ position, choice, totalChoices, index }) {
  const texture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/textures/bluewood.jpg`);
  const isRightmost = totalChoices != null && index === totalChoices - 1;
  const textX = isRightmost ? 0.88 : 0.72;
  const pos = [position[0] * 0.8, position[1], position[2] * 0.8];
  return (
    <group position={pos}>
      <ShaderTextPlane text={choice.text} position={[textX, 0, -0.3]} />
      <mesh position={[0.48, 0, 0]}>
        <boxGeometry args={[1.45, 2.9, 0.1]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PLACEHOLDER_Z = -500;
const TARGET_X = 20;
const TARGET_Y = -35;
const ZOOM_DURATION = 3500;
const HANDOFF_PROGRESS = 0.999;

// ─── Scene (3D content for one scenario) ────────────────────────────────────
function Scene({ scenario, nextScenario, onFinish, doorRefs, onZoomStart }) {
  const { camera } = useThree();
  const initialQuat = useRef();

  const zoomTargetPosition = useMemo(() => new Vector3(TARGET_X, TARGET_Y, PLACEHOLDER_Z + 6), []);
  const placeholderPosition = useMemo(() => new Vector3(TARGET_X, TARGET_Y - (-2.2), PLACEHOLDER_Z), []);

  const interactionReadyRef = useRef(false);

  useEffect(() => {
    camera.lookAt(0, -2.2, 0);
    initialQuat.current = camera.quaternion.clone();
  }, [camera]);

  useEffect(() => {
    setHovered(null);
    interactionReadyRef.current = false;
    const t = setTimeout(() => { interactionReadyRef.current = true; }, 300);
    return () => clearTimeout(t);
  }, [scenario]);

  const [clicked, setClicked] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [doorOverrides, setDoorOverrides] = useState(null);
  const [movingDoorIndex, setMovingDoorIndex] = useState(null);


  const activeClickedRef = useRef(null);
  const zoomStartRef = useRef(null);
  const zoomStartPositionRef = useRef(null);
  const handoffDoneRef = useRef(false);
  const hasResetDoorsRef = useRef(false);
  const directionRef = useRef(null);

  const spacing = 3.6;
  const y = -2.8;
  const defaultPos = new Vector3(0, -2.2, 6);

  const originalDoorPositions = scenario.choices.map((_, i) => {
    const total = scenario.choices.length;
    const x = i * spacing - ((total - 1) * spacing) / 2 - 0.48;
    return [x, y, 0];
  });

  const placeholderDoorPositions = nextScenario
    ? nextScenario.choices.map((_, i) => {
      const total = nextScenario.choices.length;
      const x = i * spacing - ((total - 1) * spacing) / 2 - 0.48;
      return [x, y, 0];
    })
    : [];

  const doorPositions = doorOverrides ? doorOverrides : originalDoorPositions;
  const CENTER_POSITION = [-0.48, y, 0];

  useFrame(() => {
    if (initialQuat.current) {
      camera.quaternion.copy(initialQuat.current);
      camera.rotation.setFromQuaternion(initialQuat.current);
    }

    // Idle: gently return to default
    if (activeClickedRef.current === null) {
      const lerpAlpha = 0.05;
      camera.position.x += (defaultPos.x - camera.position.x) * lerpAlpha;
      camera.position.y += (defaultPos.y - camera.position.y) * lerpAlpha;
      camera.position.z += (defaultPos.z - camera.position.z) * lerpAlpha;
      camera.fov += (52 - camera.fov) * 0.05;
      camera.updateProjectionMatrix();
    }

    // Zooming in
    if (activeClickedRef.current !== null) {
      const now = Date.now();
      if (!zoomStartRef.current) zoomStartRef.current = now;
      const elapsed = now - zoomStartRef.current;
      const rawProgress = Math.min(elapsed / ZOOM_DURATION, 1);
      const progress = easeInOutQuint(rawProgress);

      if (progress < HANDOFF_PROGRESS) {
        const startPos = zoomStartPositionRef.current || defaultPos.clone();
        const t = progress / HANDOFF_PROGRESS;
        camera.position.lerpVectors(startPos, zoomTargetPosition, t);
        camera.updateProjectionMatrix();

        // Once past the original doors, hide them
        if (camera.position.z < -2 && !hasResetDoorsRef.current) {
          hasResetDoorsRef.current = true;
          setClicked(null);
          setDoorOverrides(null);
          setMovingDoorIndex(null);
        }
      } else {
        // Handoff: snap camera back silently, trigger transition
        if (!handoffDoneRef.current) {
          handoffDoneRef.current = true;

          camera.position.copy(defaultPos);
          camera.fov = 52;
          camera.updateProjectionMatrix();
          if (initialQuat.current) {
            camera.quaternion.copy(initialQuat.current);
            camera.rotation.setFromQuaternion(initialQuat.current);
          }

          const finishedIndex = activeClickedRef.current;
          activeClickedRef.current = null;
          setClicked(null);
          setDoorOverrides(null);
          setMovingDoorIndex(null);
          directionRef.current = null;

          // Reset all refs for next use
          handoffDoneRef.current = false;
          zoomStartRef.current = null;
          zoomStartPositionRef.current = null;
          hasResetDoorsRef.current = false;

          if (typeof onFinish === "function") onFinish(finishedIndex);
        }
      }
    }
  });

  function handleDoorClick(i) {
    if (!interactionReadyRef.current) return;
    if (activeClickedRef.current !== null) return;

    const doZoom = () => {
      activeClickedRef.current = i;
      handoffDoneRef.current = false;
      setClicked(i);
      zoomStartRef.current = null;
      zoomStartPositionRef.current = camera.position.clone();
      hasResetDoorsRef.current = false;
      onZoomStart && onZoomStart();
    };

    if (i === 1) {
      doZoom();
    } else {
      setMovingDoorIndex(i);
      setDoorOverrides(scenario.choices.map((_, j) => (j === i ? CENTER_POSITION : null)));
      setTimeout(doZoom, 600);
    }
  }

  return (
    <>
      <group renderOrder={5}>
        <Text position={[0, 0.72, -2]} fontSize={0.28} color="white" anchorX="center" anchorY="middle" renderOrder={5} depthTest={false} depthWrite={false}>
          {scenario.title}
        </Text>
        <Text position={[0, 0.12, -2]} fontSize={0.16} maxWidth={6} color="white" anchorX="center" anchorY="middle" textAlign="center" renderOrder={5} depthTest={false} depthWrite={false}>
          {scenario.description}
        </Text>

        {scenario.choices.map((choice, i) => {
          if (movingDoorIndex !== null && i !== movingDoorIndex) return null;
          return (
            <Door
              key={i}
              index={i}
              position={doorOverrides && doorOverrides[i] ? doorOverrides[i] : doorPositions[i]}
              choice={choice}
              onClick={handleDoorClick}
              isClicked={clicked === i}
              isHovered={hovered === i && clicked === null}
              setHovered={(val) => { if (interactionReadyRef.current) setHovered(val); }}
              doorRef={(el) => (doorRefs.current[i] = el)}
              totalChoices={scenario.choices.length}
            />
          );
        })}
      </group>

      {/* Placeholder next scene, placed far ahead for zoom target */}
      {nextScenario && (
        <group position={placeholderPosition.toArray()} renderOrder={4}>
          <Text position={[0, 0.72, -2]} fontSize={0.28} color="white" anchorX="center" anchorY="middle" renderOrder={4} depthTest={true} depthWrite={false}>
            {nextScenario.title}
          </Text>
          <Text position={[0, 0.12, -2]} fontSize={0.16} maxWidth={6} color="white" anchorX="center" anchorY="middle" textAlign="center" renderOrder={4} depthTest={true} depthWrite={false}>
            {nextScenario.description}
          </Text>
          {nextScenario.choices.map((choice, i) => (
            <PlaceholderDoor
              key={i}
              index={i}
              position={placeholderDoorPositions[i] || [0, 0, 0]}
              choice={choice}
              totalChoices={nextScenario.choices.length}
            />
          ))}
        </group>
      )}
    </>
  );
}

// ─── Sliding transition wrapper ──────────────────────────────────────────────
function TransitionManager({ scenario, nextScenario, onFinish, doorRefs, direction, onZoomStart }) {
  const transitions = useTransition(scenario, {
    keys: s => s.title,
    from: { position: [direction * 18, 0, 0] },
    enter: { position: [0, 0, 0] },
    leave: { position: [-direction * 18, 0, 0] },
    config: { tension: 110, friction: 22 },
  });

  return transitions((style, item) => (
    <animated.group position={style.position}>
      <Scene
        scenario={item}
        nextScenario={nextScenario}
        onFinish={onFinish}
        doorRefs={doorRefs}
        onZoomStart={onZoomStart}
      />
    </animated.group>
  ));
}

// ─── Camera setup ────────────────────────────────────────────────────────────
function CameraController() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, -2.2, 0);
  }, [camera]);
  return null;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export default function ScenarioScene({ scenario, nextScenario, choices, onChoice, direction, onNavigate }) {
  const doorRefs = useRef([]);
  const cooldownRef = useRef(false);
  const touchStartXRef = useRef(null);
  const [isZooming, setIsZooming] = useState(false);

  function fireNavigate(dir) {
    if (cooldownRef.current || isZooming) return;
    cooldownRef.current = true;
    onNavigate && onNavigate(dir);
    setTimeout(() => { cooldownRef.current = false; }, 700);
  }

  function handleWheel(e) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 40) fireNavigate(1);
      else if (e.deltaX < -40) fireNavigate(-1);
    }
  }

  function handleTouchStart(e) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartXRef.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (dx < -60) fireNavigate(1);
    else if (dx > 60) fireNavigate(-1);
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
            nextScenario={nextScenario}
            onFinish={onChoice}
            doorRefs={doorRefs}
            direction={direction || 1}
            onZoomStart={() => setIsZooming(true)}
          />
        </Suspense>
      </Canvas>
      <MaskGrid choices={choices} />
    </div>
  );
}
