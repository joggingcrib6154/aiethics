import React, { useState, useRef, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3 } from "three";
import { animated, useSpring } from "@react-spring/three";
import { Text } from "@react-three/drei";
import MaskGrid from "./MaskGrid";
import WormholeEffect from "./DoorShaders";
import BackgroundShader from "./BackgroundShaders";

const FRAGMENT_APPEAR_DELAY = 600;

function Door({ index, position, choice, onClick, isClicked, isHovered, setHovered, doorRef }) {
  const texture = useLoader(TextureLoader, "/textures/bluewood.jpg");
  const groupRef = useRef();

  const { pos, rot } = useSpring({
    pos: isClicked ? position : position.map(v => v * 0.8),
    rot: isClicked ? [0, -3.1, 0] : isHovered ? [0, -2.88, 0] : [0, 0, 0],
    config: { mass: 1, tension: 180, friction: 20 },
  });

  return (
    <animated.group ref={(node) => {
      groupRef.current = node;
      if (doorRef) doorRef(node);
    }} position={pos}>
      <Text
        position={[0.6, 0, -0.3]}
        fontSize={0.136}
        color="white"
        maxWidth={0.05}
        lineHeight={1.44}
        textAlign="center"
        anchorX="center"
        anchorY="middle"
      >
        {choice.text}
      </Text>

      <mesh
        position={[0.48, 0, 0.05]}
        onClick={() => onClick(index)}
        onPointerOver={() => setHovered(index)}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[0.96, 1.92, 0.2]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <animated.group rotation={rot}>
        <mesh position={[0.48, 0, 0]}>
          <boxGeometry args={[1.1, 2.2, 0.1]} />
          <meshStandardMaterial map={texture} />
        </mesh>
      </animated.group>
    </animated.group>
  );
}

function Scene({ scenario, onFinish, setMaskAnimateTo, setShowMaskGrid, choices, setShowWormhole, doorRefs }) {
  const { camera } = useThree();
  const initialQuat = useRef();

  useEffect(() => {
    camera.lookAt(0, 1.6, 0);
    initialQuat.current = camera.quaternion.clone();
  }, []);

  const [clicked, setClicked] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [doorOverrides, setDoorOverrides] = useState(null);
  const directionRef = useRef(null);
  const resetRef = useRef(false);
  const zoomOutTimerRef = useRef(null);
  // const doorRefs = useRef([]);
  const activeClickedRef = useRef(null);
  const [movingDoorIndex, setMovingDoorIndex] = useState(null);
  const [backgroundHidden, setBackgroundHidden] = useState(false);

  const reachedTargetTimeRef = useRef(null);
  const overshootPositionRef = useRef(null);
  const zoomStartRef = useRef(null);
  const ZOOM_DURATION = 1500;
  const ZOOM_SPEED = 5;


  const defaultPos = new Vector3(0, 1.6, 6);
  const defaultLook = new Vector3(0, 1.6, 0);
  const spacing = 3.6;
  const y = 1.6;

  const originalDoorPositions = scenario.choices.map((_, i) => {
    const total = scenario.choices.length;
    const x = i * spacing - ((total - 1) * spacing) / 2 - 0.4;
    return [x, y, 0];
  });

  const doorPositions = doorOverrides ? doorOverrides : originalDoorPositions;

  const CENTER_POSITION = [0, y, 0];

    useFrame((state, delta) => {
      if (initialQuat.current) {
        camera.quaternion.copy(initialQuat.current);
        camera.rotation.setFromQuaternion(initialQuat.current);
      }

      if (activeClickedRef.current !== null && directionRef.current) {
        const now = Date.now();
        if (!zoomStartRef.current) zoomStartRef.current = now;
        const elapsed = now - zoomStartRef.current;

        if (elapsed < ZOOM_DURATION) {
          const move = directionRef.current.clone().multiplyScalar(ZOOM_SPEED * delta);
          camera.position.add(move);
          camera.fov += (38 - camera.fov) * 0.09;
          camera.updateProjectionMatrix();
        } else {
          if (!resetRef.current) {
            resetRef.current = true;
            zoomOutTimerRef.current = Date.now();
            setDoorOverrides(null);
            const finishedIndex = activeClickedRef.current;
            activeClickedRef.current = null;
            setClicked(null);
            directionRef.current = null;
            setMovingDoorIndex(null);
            zoomStartRef.current = null;
            if (setShowWormhole) setShowWormhole(true);
            if (typeof onFinish === "function") onFinish(finishedIndex);
          }
        }
      }

      if (resetRef.current) {
        const lerpAlpha = 0.15;
        if (camera.position.distanceTo(defaultPos) > 0.01) {
          camera.position.x += (defaultPos.x - camera.position.x) * lerpAlpha;
          camera.position.y += (defaultPos.y - camera.position.y) * lerpAlpha;
          camera.position.z += (defaultPos.z - camera.position.z) * lerpAlpha;
        } else {
          camera.position.copy(defaultPos);
        }
        camera.fov += (50 - camera.fov) * 0.15;
        camera.updateProjectionMatrix();
        if (initialQuat.current) {
          camera.quaternion.copy(initialQuat.current);
          camera.rotation.setFromQuaternion(initialQuat.current);
        }
        if (camera.position.distanceTo(defaultPos) < 0.05 && Math.abs(camera.fov - 50) < 0.5) {
          camera.position.copy(defaultPos);
          camera.fov = 50;
          camera.updateProjectionMatrix();
          if (initialQuat.current) {
            camera.quaternion.copy(initialQuat.current);
            camera.rotation.setFromQuaternion(initialQuat.current);
          }
          resetRef.current = false;
          zoomOutTimerRef.current = null;
          setMovingDoorIndex(null);
          setDoorOverrides(null);
          setShowMaskGrid(true);
          setBackgroundHidden(false);
        }
      }
    });


  const MOVE_TO_CENTER_DURATION = 600;

  function handleDoorClick(i) {
    if (i === 1) {
      startZoom(i);
    } else {
      setMovingDoorIndex(i);
      setDoorOverrides(scenario.choices.map((_, j) => (j === i ? CENTER_POSITION : null)));
      setTimeout(() => {
        startZoom(i);
      }, MOVE_TO_CENTER_DURATION);
    }
  }

  function startZoom(i) {
    activeClickedRef.current = i;
    setClicked(i);
    setBackgroundHidden(false);

    if (doorRefs.current[i]) {
      const doorCenter = new Vector3();
      doorRefs.current[i].getWorldPosition(doorCenter);
      const offset = new Vector3(0.57, 0.5, 0); 
      const targetPos = doorCenter.clone().add(offset);
      const dir = targetPos.clone().sub(camera.position).normalize();
      directionRef.current = dir;
    } else {
      const fwd = new Vector3();
      camera.getWorldDirection(fwd);
      fwd.normalize();
      directionRef.current = fwd.clone();
    }

    if (doorRefs.current[i]) {
      const doorFrontPos = new Vector3();
      doorRefs.current[i].getWorldPosition(doorFrontPos);
      const projected = doorFrontPos.clone().project(camera);
      const leftPct = ((projected.x + 1) / 2) * 100;
      const topPct = ((-projected.y + 1) / 2) * 100;
      setMaskAnimateTo({ top: topPct + '%', left: leftPct + '%', scale: 1, right: 'auto' });
    }


    zoomStartRef.current = null;
    resetRef.current = false;
  }

  return (
    <>
      <BackgroundShader visible={!backgroundHidden} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {!backgroundHidden && (
        <group renderOrder={5}>
          <Text
            position={[0, 5.2, -2]}
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
            position={[0, 4.8, -2]}
            fontSize={0.16}
            maxWidth={6}
            color="white"
            anchorX="center"
            anchorY="middle"
            renderOrder={5}
            depthTest={false}
            depthWrite={false}
          >
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
                onClick={(index) => {
                  if (movingDoorIndex === null) handleDoorClick(index);
                }}
                isClicked={clicked === i}
                isHovered={hovered === i}
                setHovered={setHovered}
                doorRef={(el) => (doorRefs.current[i] = el)}
              />
            );
          })}
        </group>
      )}

    </>
  );
}

export default function ScenarioScene({ scenario, choices, onChoice }) {
  const [maskAnimateTo, setMaskAnimateTo] = useState({ top: 0, right: 0, scale: 0.5 });
  const [showMaskGrid, setShowMaskGrid] = useState(false);
  const [showWormhole, setShowWormhole] = useState(false);
  const doorRefs = useRef([]);
  return (
    <div className="canvas-container" style={{ width: "100vw", height: "100vh", position: 'relative' }}>
      <Canvas
        frameloop="always"
        shadows
        camera={{ position: [0, 1.6, 6], fov: 50 }}
        style={{ pointerEvents: "auto" }}
      >
        <Suspense fallback={null}>
          <Scene
            scenario={scenario}
            onFinish={onChoice}
            setMaskAnimateTo={setMaskAnimateTo}
            setShowMaskGrid={setShowMaskGrid}
            choices={choices}
            setShowWormhole={setShowWormhole}
            doorRefs={doorRefs}
          />
          <WormholeEffect doorRefs={doorRefs} active={true} visible={showWormhole} />
        </Suspense>
      </Canvas>
      {showMaskGrid && <MaskGrid choices={choices} animateTo={maskAnimateTo} />}
    </div>
  );
}