import React, { useState, useRef, Suspense, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { useTransition } from "@react-spring/three";
import { Text } from "@react-three/drei";
import MaskGrid from "./MaskGrid";
import BackgroundShader from "./BackgroundShaders";

// ─── Easing helpers ───────────────────────────────────────────────────────────
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Shader-animated text on doors ────────────────────────────────────────────
function ShaderTextPlane({ text, position }) {
  const textRef = useRef();
  const noiseOffset = useMemo(() => Math.random() * 100, []);
  useFrame((state) => {
    if (!textRef.current) return;
    const time = state.clock.elapsedTime * 0.2;
    const uv = 0.5, movement = time * 0.1, f1 = 3.0, f2 = 2.0;
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
// flyOff      = non-selected door shoots left immediately on click
// holdAtCenter = selected door locked to center (until CLEAR_DELAY ms)
// flyOffSelf  = selected door finally shoots left at CLEAR_DELAY
function Door({ index, position, choice, onClick, isClicked, isHovered,
  setHovered, doorRef, totalChoices, flyOff, holdAtCenter, flyOffSelf }) {
  const texture = useLoader(TextureLoader, `${process.env.PUBLIC_URL}/textures/bluewood.jpg`);
  const groupRef = useRef();
  const isRightmost = totalChoices != null && index === totalChoices - 1;
  const textX = isRightmost ? 0.88 : 0.72;
  const shooting = flyOff || flyOffSelf;

  const targetPos = shooting
    ? [position[0] - 24, position[1], position[2]]              // shoot left
    : holdAtCenter
      ? [CENTER_X, DOOR_Y, 0]                                   // held at center
      : isClicked
        ? position                                               // spring moving to pos
        : [position[0] * 0.8, position[1], position[2] * 0.8]; // idle offset

  const { pos, rot } = useSpring({
    pos: targetPos,
    rot: isClicked && !shooting ? [0, -3.1, 0] : isHovered ? [0, -2.88, 0] : [0, 0, 0],
    config: shooting
      ? { tension: 230, friction: 22 }
      : { mass: 1, tension: 180, friction: 20 },
  });

  return (
    <animated.group ref={(node) => { groupRef.current = node; if (doorRef) doorRef(node); }} position={pos}>
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

// ─── Placeholder door (next-scenario preview, non-interactive) ────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const SPACING = 3.6;
const DOOR_Y = -2.8;
const CENTER_X = -0.48;
const CAM_DEFAULT = { x: 0, y: -2.2, z: 6 };
const CAM_PEAK_Z = -20;        // camera zooms deeply past the doors
const FOV_DEFAULT = 52;
const FOV_PEAK = 44;
const NEXT_START_Z = -125000;  // very far back, but approaching smoothly
const NEXT_PEAK_Z = CAM_PEAK_Z - 6; // next scenario stops exactly 6 units in front of the camera peak
// Phase durations (ms)
const PHASE1_DUR = 3000;       // much longer zoom-in
const PHASE2_DUR = 2500;       // longer synchronized zoom-out

// ─── 3-D Scene ────────────────────────────────────────────────────────────────
function Scene({ scenario, nextScenario, onFinish, doorRefs, onAnimStart }) {
  const { camera } = useThree();
  const initialQuat = useRef();

  const interactionReadyRef = useRef(false);
  useEffect(() => {
    interactionReadyRef.current = false;
    const t = setTimeout(() => { interactionReadyRef.current = true; }, 350);
    return () => clearTimeout(t);
  }, [scenario]);

  useEffect(() => {
    camera.lookAt(0, CAM_DEFAULT.y, 0);
    initialQuat.current = camera.quaternion.clone();
  }, [camera]);

  // ── door state ──────────────────────────────────────────────────────────────
  const [clickedDoor, setClickedDoor] = useState(null);
  const [flyOffOthers, setFlyOffOthers] = useState(false);
  const [flyOffSelected, setFlyOffSelected] = useState(false);
  const [holdAtCenter, setHoldAtCenter] = useState(false);  // keeps selected at center
  const [showText, setShowText] = useState(true);            // hides title/desc at CLEAR_DELAY
  const [hovered, setHovered] = useState(null);

  // ── animation refs ──────────────────────────────────────────────────────────
  // phase: 'idle' | 'phase1' | 'phase2'
  const phaseRef = useRef('idle');
  const phase1StartRef = useRef(null);
  const phase2StartRef = useRef(null);
  const handoffDoneRef = useRef(false);
  const selectedRef = useRef(null);
  const clearFiredRef = useRef(false);   // tracks whether CLEAR_DELAY event fired
  const nextGroupRef = useRef();

  // Door positions for current scenario
  const doorPositions = useMemo(() => scenario.choices.map((_, i) => {
    const total = scenario.choices.length;
    const x = i * SPACING - ((total - 1) * SPACING) / 2 + CENTER_X;
    return [x, DOOR_Y, 0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [scenario]);

  // Door positions for next scenario (same layout, offset inside the group)
  const nextDoorPositions = useMemo(() => nextScenario
    ? nextScenario.choices.map((_, i) => {
      const total = nextScenario.choices.length;
      const x = i * SPACING - ((total - 1) * SPACING) / 2 + CENTER_X;
      return [x, DOOR_Y, 0];
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    : [], [nextScenario]);

  // ── useFrame ─────────────────────────────────────────────────────────────────
  useFrame(() => {
    // Keep look direction locked
    if (initialQuat.current) {
      camera.quaternion.copy(initialQuat.current);
      camera.rotation.setFromQuaternion(initialQuat.current);
    }

    // Idle: float back to default
    if (phaseRef.current === 'idle') {
      camera.position.x += (CAM_DEFAULT.x - camera.position.x) * 0.05;
      camera.position.y += (CAM_DEFAULT.y - camera.position.y) * 0.05;
      camera.position.z += (CAM_DEFAULT.z - camera.position.z) * 0.05;
      camera.fov += (FOV_DEFAULT - camera.fov) * 0.05;
      camera.updateProjectionMatrix();
      return;
    }

    // ── Phase 1: camera zooms IN ─────────────────────────────────────────────
    if (phaseRef.current === 'phase1') {
      if (!phase1StartRef.current) phase1StartRef.current = Date.now();
      const elapsed = Date.now() - phase1StartRef.current;
      const t1 = Math.min(elapsed / PHASE1_DUR, 1);
      const e1 = easeInOutCubic(t1);

      camera.position.z = THREE.MathUtils.lerp(CAM_DEFAULT.z, CAM_PEAK_Z, e1);
      camera.fov = THREE.MathUtils.lerp(FOV_DEFAULT, FOV_PEAK, e1);
      camera.updateProjectionMatrix();

      // Next content rushes from extremely far toward the target peak (e1 for smooth arrival)
      if (nextGroupRef.current) {
        nextGroupRef.current.position.z = THREE.MathUtils.lerp(NEXT_START_Z, NEXT_PEAK_Z, easeInOutCubic(t1));
      }

      // Hide text and let door fly left only when camera has actually gone past it (z < -0.5)
      // so it's guaranteed to be out of view before it gets moved.
      if (!clearFiredRef.current && camera.position.z < -0.5) {
        clearFiredRef.current = true;
        setShowText(false);
        setHoldAtCenter(false);
        setFlyOffSelected(true);
      }

      if (t1 >= 1) {
        phaseRef.current = 'phase2';
        phase2StartRef.current = null;
      }
    }

    // ── Phase 2: camera zooms OUT — next content stays at NEXT_START_Z until snap ──
    if (phaseRef.current === 'phase2') {
      if (!phase2StartRef.current) phase2StartRef.current = Date.now();
      const elapsed = Date.now() - phase2StartRef.current;
      const t2 = Math.min(elapsed / PHASE2_DUR, 1);
      const e2 = easeInOutCubic(t2);

      camera.position.z = THREE.MathUtils.lerp(CAM_PEAK_Z, CAM_DEFAULT.z, e2);
      camera.fov = THREE.MathUtils.lerp(FOV_PEAK, FOV_DEFAULT, e2);
      camera.updateProjectionMatrix();

      // Next content closes identical easing: from NEXT_PEAK_Z to 0 (same physical speed as camera)
      if (nextGroupRef.current) {
        nextGroupRef.current.position.z = THREE.MathUtils.lerp(NEXT_PEAK_Z, 0, e2);
      }

      // Handoff
      if (t2 >= 1 && !handoffDoneRef.current) {
        handoffDoneRef.current = true;

        camera.position.set(CAM_DEFAULT.x, CAM_DEFAULT.y, CAM_DEFAULT.z);
        camera.fov = FOV_DEFAULT;
        camera.updateProjectionMatrix();
        if (initialQuat.current) {
          camera.quaternion.copy(initialQuat.current);
          camera.rotation.setFromQuaternion(initialQuat.current);
        }

        const chosen = selectedRef.current;

        // Full reset for re-use
        phaseRef.current = 'idle';
        phase1StartRef.current = null;
        phase2StartRef.current = null;
        handoffDoneRef.current = false;
        clearFiredRef.current = false;
        selectedRef.current = null;

        if (typeof onFinish === 'function') onFinish(chosen);
      }
    }
  });

  // ── door click handler ──────────────────────────────────────────────────────
  function handleDoorClick(i) {
    if (!interactionReadyRef.current) return;
    if (phaseRef.current !== 'idle') return;

    selectedRef.current = i;
    setClickedDoor(i);        // door swings open
    setHoldAtCenter(true);    // locks selected door to center (spring will move it there)
    setFlyOffOthers(true);    // non-selected doors shoot left immediately
    setShowText(true);        // make sure text is showing (reset)
    setHovered(null);
    clearFiredRef.current = false;
    phaseRef.current = 'phase1';
    phase1StartRef.current = null;
    onAnimStart && onAnimStart();
  }

  return (
    <>
      {/* Current scenario text — hidden at CLEAR_DELAY */}
      {showText && (
        <>
          <Text position={[0, 0.72, -2]} fontSize={0.28} color="white"
            anchorX="center" anchorY="middle" renderOrder={5} depthTest={false} depthWrite={false}>
            {scenario.title}
          </Text>
          <Text position={[0, 0.12, -2]} fontSize={0.16} maxWidth={6} color="white"
            anchorX="center" anchorY="middle" textAlign="center" renderOrder={5} depthTest={false} depthWrite={false}>
            {scenario.description}
          </Text>
        </>
      )}

      {/* Current scenario doors */}
      {scenario.choices.map((choice, i) => (
        <Door
          key={i} index={i}
          position={doorPositions[i]}
          choice={choice}
          onClick={handleDoorClick}
          isClicked={clickedDoor === i}
          isHovered={hovered === i && clickedDoor === null}
          flyOff={flyOffOthers && i !== clickedDoor}
          holdAtCenter={holdAtCenter && i === clickedDoor}
          flyOffSelf={flyOffSelected && i === clickedDoor}
          setHovered={(val) => {
            if (interactionReadyRef.current && phaseRef.current === 'idle') setHovered(val);
          }}
          doorRef={(el) => (doorRefs.current[i] = el)}
          totalChoices={scenario.choices.length}
        />
      ))}

      {/* Next scenario — stays at NEXT_START_Z until the very end of animation */}
      {nextScenario && (
        <group ref={nextGroupRef} position={[0, 0, NEXT_START_Z]}>
          <Text position={[0, 0.72, -2]} fontSize={0.28} color="white"
            anchorX="center" anchorY="middle" renderOrder={4} depthTest={false} depthWrite={false}>
            {nextScenario.title}
          </Text>
          <Text position={[0, 0.12, -2]} fontSize={0.16} maxWidth={6} color="white"
            anchorX="center" anchorY="middle" textAlign="center" renderOrder={4} depthTest={false} depthWrite={false}>
            {nextScenario.description}
          </Text>
          {nextScenario.choices.map((choice, i) => (
            <PlaceholderDoor key={i} index={i}
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

// ─── Sliding transition wrapper (timeline nav only) ───────────────────────────
function TransitionManager({ scenario, nextScenario, onFinish, doorRefs,
  direction, skipSlide, onAnimStart }) {
  const transitions = useTransition(scenario, {
    keys: s => s.title,
    immediate: skipSlide,
    from: { position: [direction * 18, 0, 0] },
    enter: { position: [0, 0, 0] },
    leave: { position: [-direction * 18, 0, 0] },
    config: { tension: 110, friction: 22 },
  });
  return transitions((style, item) => (
    <animated.group position={style.position}>
      <Scene scenario={item} nextScenario={nextScenario} onFinish={onFinish}
        doorRefs={doorRefs} onAnimStart={onAnimStart} />
    </animated.group>
  ));
}

// ─── Camera initializer ───────────────────────────────────────────────────────
function CameraController() {
  const { camera } = useThree();
  useEffect(() => { camera.lookAt(0, CAM_DEFAULT.y, 0); }, [camera]);
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

  function handleTouchStart(e) { touchStartXRef.current = e.touches[0].clientX; }
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
      <Canvas frameloop="always" shadows
        camera={{ position: [CAM_DEFAULT.x, CAM_DEFAULT.y, CAM_DEFAULT.z], fov: FOV_DEFAULT, near: 0.1, far: 500000 }}
        style={{ pointerEvents: "auto", width: "100%", height: "100%" }}>
        <CameraController />
        <Suspense fallback={null}>
          <BackgroundShader visible={true} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <TransitionManager
            scenario={scenario} nextScenario={nextScenario}
            onFinish={onChoice} doorRefs={doorRefs}
            direction={direction || 1} skipSlide={skipSlide}
            onAnimStart={() => setIsAnimating(true)}
          />
        </Suspense>
      </Canvas>
      <MaskGrid choices={choices} />
    </div>
  );
}
