import React, { useState, useRef, Suspense, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { useTransition } from "@react-spring/three";
import { Text } from "@react-three/drei";
import MaskGrid from "./MaskGrid";
import BackgroundShader from "./BackgroundShaders";

// ─── Easing ───────────────────────────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── Shader-animated text on doors ────────────────────────────────────────────
function ShaderTextPlane({ text, position }) {
  const textRef = useRef();
  const noiseOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state) => {
    if (!textRef.current) return;
    const time = state.clock.elapsedTime * 0.2;
    const uv = 0.5;
    const movement = time * 0.1;
    const f1 = 3.0, f2 = 2.0;
    const n1 = (Math.sin((uv + movement + noiseOffset) * f1 * 2) +
      Math.sin((uv + movement + noiseOffset) * f1 * 3.1) +
      Math.sin((uv + movement + noiseOffset) * f1 * 5.7)) / 3;
    const n2 = (Math.sin((uv - movement + noiseOffset) * f2 * 2 + n1 * 0.3) +
      Math.sin((uv - movement + noiseOffset) * f2 * 3.1 + n1 * 0.3) +
      Math.sin((uv - movement + noiseOffset) * f2 * 5.7 + n1 * 0.3)) / 3;
    const t = (n2 + 1) / 2;
    textRef.current.color = new THREE.Color(0.96, 0.87, 0.70)
      .lerp(new THREE.Color(0.314, 0.784, 0.471), t)
      .multiplyScalar(1.0 + n1 * 0.1);
  });

  return (
    <Text ref={textRef} position={position} fontSize={0.116} maxWidth={0.7}
      lineHeight={1.44} textAlign="center" anchorX="center" anchorY="middle"
      renderOrder={10} depthTest={false} depthWrite={false}>
      {text}
    </Text>
  );
}

// ─── Interactive door ─────────────────────────────────────────────────────────
function Door({ index, position, choice, onClick, isClicked, isHovered,
  setHovered, doorRef, totalChoices, flyOff }) {
  const texture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/textures/bluewood.jpg`);
  const groupRef = useRef();
  const isRightmost = totalChoices != null && index === totalChoices - 1;
  const textX = isRightmost ? 0.88 : 0.72;

  // When flying off: shoot to the left; when clicked: move to position; else idle offset
  const targetPos = flyOff
    ? [position[0] - 22, position[1], position[2]]
    : isClicked
      ? position
      : [position[0] * 0.8, position[1], position[2] * 0.8];

  const { pos, rot } = useSpring({
    pos: targetPos,
    rot: isClicked ? [0, -3.1, 0] : isHovered ? [0, -2.88, 0] : [0, 0, 0],
    config: flyOff
      ? { tension: 220, friction: 24 }      // fast snap off
      : { mass: 1, tension: 180, friction: 20 },
  });

  return (
    <animated.group ref={(node) => {
      groupRef.current = node;
      if (doorRef) doorRef(node);
    }} position={pos}>
      <ShaderTextPlane text={choice.text} position={[textX, 0, -0.3]} />
      <mesh position={[0.48, 0, 0.05]}
        onClick={() => onClick(index)}
        onPointerOver={() => setHovered(index)}
        onPointerOut={() => setHovered(null)}>
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

// ─── Placeholder door (non-interactive, for next-scenario preview) ────────────
function PlaceholderDoor({ position, choice, totalChoices, index }) {
  const texture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/textures/bluewood.jpg`);
  const isRightmost = totalChoices != null && index === totalChoices - 1;
  const textX = isRightmost ? 0.88 : 0.72;
  // Match the idle visual offset of interactive doors
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

// ─── Animation durations ──────────────────────────────────────────────────────
const ZOOM_DURATION = 2200; // ms — how long the full zoom+approach takes

// ─── 3-D Scene for one scenario ───────────────────────────────────────────────
function Scene({ scenario, nextScenario, onFinish, doorRefs, onAnimStart }) {
  const { camera } = useThree();
  const initialQuat = useRef();

  // Saved starting camera to lerp from
  const camStartPos = useRef({ x: 0, y: -2.2, z: 6 });
  const camStartFov = useRef(52);

  // After scene change, prevent clicks for a moment
  const interactionReadyRef = useRef(false);
  useEffect(() => {
    interactionReadyRef.current = false;
    const t = setTimeout(() => { interactionReadyRef.current = true; }, 350);
    return () => clearTimeout(t);
  }, [scenario]);

  useEffect(() => {
    camera.lookAt(0, -2.2, 0);
    initialQuat.current = camera.quaternion.clone();
  }, [camera]);

  // Door state
  const [clickedDoor, setClickedDoor] = useState(null);   // opens (swings)
  const [flyingOff, setFlyingOff] = useState(false);      // non-clicked doors shoot left
  const [hovered, setHovered] = useState(null);

  // Animation state (all in refs for useFrame)
  const animPhaseRef = useRef('idle');   // 'idle' | 'animating' | 'done'
  const animStartRef = useRef(null);
  const handoffDoneRef = useRef(false);
  const selectedRef = useRef(null);

  // Ref to the "next scenario" group so we can imperatively move it
  const nextGroupRef = useRef();

  const spacing = 3.6;
  const y = -2.8;
  const defaultCamZ = 6;
  const targetCamZ = 2.5;   // zoom-in camera Z
  const targetFov = 42;
  const nextStartZ = -45;   // where next-scenario group begins (far behind)
  const nextEndZ = 0;       // where it ends up (exactly where current scene lives)

  const doorPositions = useMemo(() => scenario.choices.map((_, i) => {
    const total = scenario.choices.length;
    const x = i * spacing - ((total - 1) * spacing) / 2 - 0.48;
    return [x, y, 0];
  }), [scenario]);

  const nextDoorPositions = useMemo(() => nextScenario
    ? nextScenario.choices.map((_, i) => {
      const total = nextScenario.choices.length;
      const x = i * spacing - ((total - 1) * spacing) / 2 - 0.48;
      return [x, y, 0];
    })
    : [], [nextScenario]);

  // ── per-frame animation ────────────────────────────────────────────────────
  useFrame(() => {
    // Always lock look direction
    if (initialQuat.current) {
      camera.quaternion.copy(initialQuat.current);
      camera.rotation.setFromQuaternion(initialQuat.current);
    }

    if (animPhaseRef.current === 'idle') {
      // Gently float back to default if not animating
      camera.position.x += (0 - camera.position.x) * 0.05;
      camera.position.y += (-2.2 - camera.position.y) * 0.05;
      camera.position.z += (defaultCamZ - camera.position.z) * 0.05;
      camera.fov += (52 - camera.fov) * 0.05;
      camera.updateProjectionMatrix();
      return;
    }

    if (animPhaseRef.current === 'animating') {
      if (!animStartRef.current) {
        animStartRef.current = Date.now();
        // Snapshot camera starting position for smooth lerp
        camStartPos.current = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
        camStartFov.current = camera.fov;
      }

      const elapsed = Date.now() - animStartRef.current;
      const raw = Math.min(elapsed / ZOOM_DURATION, 1);
      const t = easeInOutCubic(raw);

      // Camera zooms in
      camera.position.x = camStartPos.current.x + (0 - camStartPos.current.x) * t;
      camera.position.y = camStartPos.current.y + (-2.2 - camStartPos.current.y) * t;
      camera.position.z = camStartPos.current.z + (targetCamZ - camStartPos.current.z) * t;
      camera.fov = camStartFov.current + (targetFov - camStartFov.current) * t;
      camera.updateProjectionMatrix();

      // Next-scenario content rush forward from far behind
      if (nextGroupRef.current) {
        nextGroupRef.current.position.z = nextStartZ + (nextEndZ - nextStartZ) * t;
      }

      if (raw >= 1 && !handoffDoneRef.current) {
        handoffDoneRef.current = true;

        // Snap camera back to default (invisible because React will swap scene)
        camera.position.set(0, -2.2, defaultCamZ);
        camera.fov = 52;
        camera.updateProjectionMatrix();
        if (initialQuat.current) {
          camera.quaternion.copy(initialQuat.current);
          camera.rotation.setFromQuaternion(initialQuat.current);
        }

        if (nextGroupRef.current) nextGroupRef.current.position.z = 0;

        const chosen = selectedRef.current;

        // Reset all state refs for reuse
        animPhaseRef.current = 'idle';
        animStartRef.current = null;
        handoffDoneRef.current = false;
        selectedRef.current = null;

        if (typeof onFinish === 'function') onFinish(chosen);
      }
    }
  });

  // ── door click handler ─────────────────────────────────────────────────────
  function handleDoorClick(i) {
    if (!interactionReadyRef.current) return;
    if (animPhaseRef.current !== 'idle') return;

    selectedRef.current = i;
    setClickedDoor(i);       // opens this door (spring rotation)
    setFlyingOff(true);      // other doors fly left
    setHovered(null);
    onAnimStart && onAnimStart();

    // Short pause so the door begins opening before camera moves
    setTimeout(() => {
      animPhaseRef.current = 'animating';
      animStartRef.current = null;
    }, 280);
  }

  return (
    <>
      {/* Current scenario text */}
      <Text position={[0, 0.72, -2]} fontSize={0.28} color="white"
        anchorX="center" anchorY="middle" renderOrder={5} depthTest={false} depthWrite={false}>
        {scenario.title}
      </Text>
      <Text position={[0, 0.12, -2]} fontSize={0.16} maxWidth={6} color="white"
        anchorX="center" anchorY="middle" textAlign="center" renderOrder={5} depthTest={false} depthWrite={false}>
        {scenario.description}
      </Text>

      {/* Current scenario doors */}
      {scenario.choices.map((choice, i) => (
        <Door
          key={i}
          index={i}
          position={doorPositions[i]}
          choice={choice}
          onClick={handleDoorClick}
          isClicked={clickedDoor === i}
          isHovered={hovered === i && clickedDoor === null}
          flyOff={flyingOff && clickedDoor !== i}    // non-selected fly left
          setHovered={(val) => { if (interactionReadyRef.current && animPhaseRef.current === 'idle') setHovered(val); }}
          doorRef={(el) => (doorRefs.current[i] = el)}
          totalChoices={scenario.choices.length}
        />
      ))}

      {/* Next scenario content — starts far behind doors, rushes forward on click */}
      {nextScenario && (
        <group ref={nextGroupRef} position={[0, 0, nextStartZ]} renderOrder={4}>
          <Text position={[0, 0.72, -2]} fontSize={0.28} color="white"
            anchorX="center" anchorY="middle" renderOrder={4} depthTest={false} depthWrite={false}>
            {nextScenario.title}
          </Text>
          <Text position={[0, 0.12, -2]} fontSize={0.16} maxWidth={6} color="white"
            anchorX="center" anchorY="middle" textAlign="center" renderOrder={4} depthTest={false} depthWrite={false}>
            {nextScenario.description}
          </Text>
          {nextScenario.choices.map((choice, i) => (
            <PlaceholderDoor
              key={i}
              index={i}
              position={nextDoorPositions[i] || [0, 0, 0]}
              choice={choice}
              totalChoices={nextScenario.choices.length}
            />
          ))}
        </group>
      )}
    </>
  );
}

// ─── Sliding transition wrapper (for timeline nav only) ───────────────────────
function TransitionManager({ scenario, nextScenario, onFinish, doorRefs,
  direction, skipSlide, onAnimStart }) {
  const transitions = useTransition(scenario, {
    keys: s => s.title,
    // When triggered by a door-click (skipSlide), use immediate (no animation)
    immediate: skipSlide,
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
        onAnimStart={onAnimStart}
      />
    </animated.group>
  ));
}

// ─── Camera initializer ───────────────────────────────────────────────────────
function CameraController() {
  const { camera } = useThree();
  useEffect(() => { camera.lookAt(0, -2.2, 0); }, [camera]);
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ScenarioScene({
  scenario, nextScenario, choices, onChoice, direction, onNavigate, skipSlide
}) {
  const doorRefs = useRef([]);
  const cooldownRef = useRef(false);
  const touchStartXRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  function fireNavigate(dir) {
    if (cooldownRef.current || isAnimating) return;
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
            skipSlide={skipSlide}
            onAnimStart={() => setIsAnimating(true)}
          />
        </Suspense>
      </Canvas>
      <MaskGrid choices={choices} />
    </div>
  );
}
