import React, { useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
varying vec2 vUv;

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f*f*(3.0-2.0*f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

void main() {
    vec2 uv = vUv * iResolution.xy / min(iResolution.x, iResolution.y);
    float n = noise(uv * 10.0 + iTime * 0.1);
    vec3 color = mix(vec3(0.5, 0.4, 0.7), vec3(0.53, 0.81, 0.98), n);

    gl_FragColor = vec4(color, 1.0);
}
`;

export default function BackgroundShader({ visible = true, distance = 20 }) {
  const { camera } = useThree();
  const { invalidate } = useThree();

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      transparent: true
    });
  }, []);

  useEffect(() => {
    let frame;
    const loop = () => {
      invalidate();
      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);

  useFrame(({ clock, size }) => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.iTime.value = clock.elapsedTime;
      shaderMaterial.uniforms.iResolution.value.set(size.width, size.height);
    }
  });

  return (
    <mesh visible={visible} renderOrder={-1000} frustumCulled={false} scale={[100,100,1]} position={[0,0,-5]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
}