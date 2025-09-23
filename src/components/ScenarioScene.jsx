import React, { useState, useRef, Suspense, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3 } from "three";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { Text } from "@react-three/drei";
import MaskGrid from "./MaskGrid";
import WormholeEffect from "./DoorShaders";
import BackgroundShader from "./BackgroundShaders";

const FRAGMENT_APPEAR_DELAY = 600;

const vertexShader = `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const fragmentShader = `
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;

  varying vec2 v_uv;

  // Simplex noise implementation
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  vec3 permute(vec3 x) {
    return mod289(((x*34.0)+1.0)*x);
  }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                        0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                       -0.577350269189626,  // -1.0 + 2.0 * C.x
                        0.024390243902439); // 1.0 / 41.0
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);

    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = v_uv * u_resolution.xy / min(u_resolution.x, u_resolution.y);
    float time = u_time * 0.2;

    float n = snoise(uv * 3.0 + vec2(time, time));
    float intensity = smoothstep(0.3, 0.7, n);

    vec3 baseColor = vec3(0.0, 0.5, 0.5);
    vec3 highlightColor = vec3(0.0, 0.8, 0.6);

    vec3 color = mix(baseColor, highlightColor, intensity);

    // Add subtle mouse interaction effect
    float dist = distance(uv / u_resolution.xy, u_mouse / u_resolution.xy);
    color += 0.2 * (1.0 - smoothstep(0.0, 0.3, dist));

    gl_FragColor = vec4(color, 1.0);
  }
`;

const startButtonShaderVertex = `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const startButtonShaderFragment = `
glsl
precision mediump float;

uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
varying vec2 v_uv;

#define PI 3.14159265359

// Simplex noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
        dot(x12.zw, x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 1.0;
    float freq = 1.0;
    // More octaves for more detail
    for(int i = 0; i < 6; i++) {
        sum += amp * snoise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return sum;
}

void main() {
    // Correct aspect ratio
    vec2 uv = v_uv;
    uv.x *= u_resolution.x / u_resolution.y;
    
    // Mouse influence
    float mouseInfluence = 0.0;
    float mouseDistance = length(uv - vec2(u_mouse.x * u_resolution.x / u_resolution.y, u_mouse.y));
    mouseInfluence = smoothstep(0.5, 0.0, mouseDistance);
    
    // Background - indigo sky
    vec3 indigoSky = vec3(0.18, 0.15, 0.35);
    vec3 deepIndigo = vec3(0.05, 0.05, 0.2);
    
    // Create stars
    float stars = 0.0;
    for (int i = 0; i < 3; i++) {
        float scale = pow(2.0, float(i));
        stars += smoothstep(0.95, 1.0, snoise(uv * 100.0 * scale + u_time * 0.01)) * (1.0 / scale);
    }
    
    // Aurora colors
    vec3 teal = vec3(0.0, 0.8, 0.8);
    vec3 emerald = vec3(0.0, 0.8, 0.4);
    
    // Create aurora effect
    float time = u_time * 0.1;
    float auroraBase = fbm(vec2(uv.x * 2.0, time * 0.2)) * 0.5 + 0.5;
    
    // Make the aurora move
    float yOffset = auroraBase * 0.4 - 0.1;
    yOffset += mouseInfluence * 0.15; // Aurora moves down with mouse
    
    // Intensity decreases as we move down from the top
    float auroraIntensity = smoothstep(0.0, 0.8, 1.0 - (uv.y - yOffset) * (1.0 + mouseInfluence));
    
    // Add some variation to the aurora
    float auroraDetail = fbm(vec2(uv.x * 5.0 + time, uv.y * 20.0)) * 0.1;
    auroraIntensity *= (1.0 + auroraDetail);
    
    // Add waves to the aurora
    float waves = sin(uv.x * 10.0 + time * 2.0) * 0.05 + 
                 sin(uv.x * 5.0 - time * 1.5) * 0.05;
    auroraIntensity *= (1.0 + waves);
    
    // Mouse makes the aurora more vibrant
    auroraIntensity *= (1.0 + mouseInfluence * 0.5);
    
    // Mix the teal and emerald colors
    float colorMix = sin(uv.x * 3.0 + time) * 0.5 + 0.5;
    vec3 auroraColor = mix(teal, emerald, colorMix);
    
    // Add some glow
    float glow = smoothstep(0.0, 0.5, auroraIntensity) * 0.5;
    
    // Combine everything
    vec3 finalColor = mix(deepIndigo, indigoSky, uv.y);
    finalColor += stars * vec3(1.0, 1.0, 1.0) * (1.0 - auroraIntensity * 0.5);
    finalColor += auroraColor * auroraIntensity;
    finalColor += glow * auroraColor;
    
    gl_FragColor = vec4(finalColor, 1.0);
    
    #include <colorspace_fragment>
}

`;

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

function Scene({ scenario, onFinish, setMaskAnimateTo, setShowMaskGrid, choices, setShowWormhole, doorRefs, gameStarted, setGameStarted }) {
  const { camera } = useThree();
  const initialQuat = useRef();
  const startPlaneRef = useRef();

  useEffect(() => {
    camera.lookAt(0, 4, -1);
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
      if (!gameStarted) return;

      if (initialQuat.current) {
        camera.quaternion.copy(initialQuat.current);
        camera.rotation.setFromQuaternion(initialQuat.current);
      }

      if (gameStarted && activeClickedRef.current === null && !resetRef.current) {
        const lerpAlpha = 0.05;
        camera.position.x += (defaultPos.x - camera.position.x) * lerpAlpha;
        camera.position.y += (defaultPos.y - camera.position.y) * lerpAlpha;
        camera.position.z += (defaultPos.z - camera.position.z) * lerpAlpha;
        camera.fov += (50 - camera.fov) * 0.05;
        camera.updateProjectionMatrix();
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

      if (!gameStarted && startPlaneRef.current) {
        startPlaneRef.current.material.uniforms.u_time.value = state.clock.elapsedTime;
        startPlaneRef.current.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
        startPlaneRef.current.material.uniforms.u_mouse.value = new THREE.Vector2(state.mouse.x * window.innerWidth * 0.5 + window.innerWidth * 0.5, -state.mouse.y * window.innerHeight * 0.5 + window.innerHeight * 0.5);
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

          {!gameStarted && (
            <mesh
              ref={startPlaneRef}
              position={[0, 4, -2]}
              onClick={(e) => {
                e.stopPropagation();
                setGameStarted(true);
              }}
            >
              <planeGeometry args={[20, 20]} />
              <shaderMaterial
                uniforms={{
                  u_time: { value: 0 },
                  u_mouse: { value: new THREE.Vector2() },
                  u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
                }}
                vertexShader={startButtonShaderVertex}
                fragmentShader={startButtonShaderFragment}
                side={THREE.DoubleSide}
              />
              <Text
                position={[0, 0, 0.01]}
                fontSize={0.1}
                color="black"
                anchorX="center"
                anchorY="middle"
                depthTest={false}
                depthWrite={false}
              >
                Click Anywhere to Start
              </Text>
            </mesh>
          )}

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
  const [gameStarted, setGameStarted] = useState(false);
  const doorRefs = useRef([]);
  return (
    <div className="canvas-container" style={{ width: "100vw", height: "100vh", position: 'relative' }}>
      <Canvas
        frameloop="always"
        shadows
        camera={{ position: [0, 4, 0], fov: 30 }}
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
            gameStarted={gameStarted}
            setGameStarted={setGameStarted}
          />
          <WormholeEffect doorRefs={doorRefs} active={true} visible={showWormhole} />
        </Suspense>
      </Canvas>
      {showMaskGrid && <MaskGrid choices={choices} animateTo={maskAnimateTo} />}
      {/* {!gameStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-60">
          <button
            onClick={() => setGameStarted(true)}
            className="px-6 py-3 bg-blue-500 text-white text-xl rounded hover:bg-blue-600 transition"
          >
            Start
          </button>
        </div>
      )} */}
    </div>
  );
}