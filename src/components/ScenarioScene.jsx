import ShaderText from './ShaderText';
import React, { useState, useRef, Suspense, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { TextureLoader, Vector3 } from "three";
import * as THREE from "three";
import { animated, useSpring } from "@react-spring/three";
import { Text } from "@react-three/drei";
import MaskGrid from "./MaskGrid";
import WormholeEffect from "./DoorShaders";
import BackgroundShader from "./BackgroundShaders";

const FRAGMENT_APPEAR_DELAY = 600;

// Shader for the text background on doors
const textVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const textFragmentShader = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform vec2 u_resolution;
  uniform float opacity;
  varying vec2 vUv;
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for(int i = 0; i < 5; i++) {
      value += amplitude * noise(st * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
  
  void main() {
    vec2 uv = vUv;
    
    float time = u_time * 0.2;
    vec2 movement = vec2(time * 0.1, time * 0.05);
    
    float noise1 = fbm(uv * 3.0 + movement);
    float noise2 = fbm(uv * 2.0 - movement + noise1 * 0.3);
    
    vec3 beige = vec3(0.96, 0.87, 0.70);
    vec3 emerald = vec3(0.314, 0.784, 0.471);
    
    vec3 color = mix(beige, emerald, noise2);
    color += vec3(noise1 * 0.1);
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

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


function ShaderTextPlane({ text, position }) {
  const textRef = useRef();
  const { mouse } = useThree();
  const timeRef = useRef(0);
  const noiseOffset = useMemo(() => Math.random() * 100, []); // Each text gets unique noise

  useFrame((state) => {
    timeRef.current = state.clock.elapsedTime;
    
    if (textRef.current) {
      const time = timeRef.current * 0.2;
      const uv = 0.5; // Use center point for color
      
      // Recreate the fbm noise effect
      const movement = time * 0.1;
      const freq1 = 3.0;
      const freq2 = 2.0;
      
      // Simple noise approximation using sine waves
      const noise1 = (Math.sin((uv + movement + noiseOffset) * freq1 * 2) + 
                     Math.sin((uv + movement + noiseOffset) * freq1 * 3.1) + 
                     Math.sin((uv + movement + noiseOffset) * freq1 * 5.7)) / 3;
      
      const noise2 = (Math.sin((uv - movement + noiseOffset) * freq2 * 2 + noise1 * 0.3) + 
                     Math.sin((uv - movement + noiseOffset) * freq2 * 3.1 + noise1 * 0.3) + 
                     Math.sin((uv - movement + noiseOffset) * freq2 * 5.7 + noise1 * 0.3)) / 3;
      
      // Normalize to 0-1 range
      const t = (noise2 + 1) / 2;
      
      const beige = new THREE.Color(0.96, 0.87, 0.70);
      const emerald = new THREE.Color(0.314, 0.784, 0.471);
      
      // Mix colors based on noise
      const finalColor = beige.clone().lerp(emerald, t);
      
      // Add slight brightness variation
      const brightness = 1.0 + noise1 * 0.1;
      finalColor.multiplyScalar(brightness);
      
      textRef.current.color = finalColor;
    }
  });

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={0.10}
      maxWidth={0.7}
      lineHeight={1.2}
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
      <ShaderTextPlane text={choice.text} position={[0.48, 0, -0.2]} />

      <mesh
        position={[0.48, 0, 0.05]}
        onClick={() => onClick(index)}
        onPointerOver={() => setHovered(index)}
        onPointerOut={() => setHovered(null)}
      >
        <boxGeometry args={[0.96, 1.92, 0.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
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

function Scene({ scenario, onFinish, setMaskAnimateTo, setShowMaskGrid, choices, setShowWormhole, doorRefs, gameStarted }) {
  const { camera } = useThree();
  const initialQuat = useRef();

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

    });


  const MOVE_TO_CENTER_DURATION = 300;

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
            position={[0, 4.5, -2]}
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
            position={[0, 4.1, -2]}
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

export default function ScenarioScene({ scenario, choices, onChoice, gameStarted }) {
  const [maskAnimateTo, setMaskAnimateTo] = useState({ top: 0, right: 0, scale: 0.5 });
  const [showMaskGrid, setShowMaskGrid] = useState(false);
  const [showWormhole, setShowWormhole] = useState(false);
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