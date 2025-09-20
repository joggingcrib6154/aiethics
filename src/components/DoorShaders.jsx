import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
varying vec2 v_uv;
void main() {
  vUv = uv;
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D u_map;
varying vec2 vUv;
varying vec2 v_uv;

float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

float noise(in vec2 st) {
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

vec3 aurora(vec2 uv, float time) {
    float n = noise(uv * 10.0 + vec2(0.0, time * 0.1));
    float intensity = smoothstep(0.3, 0.7, n);
    vec3 color = mix(vec3(0.0, 0.5, 0.3), vec3(0.0, 1.0, 0.8), intensity);
    color *= smoothstep(0.0, 0.5, uv.y) * (1.0 - uv.y);
    return color;
}

void main() {
    vec2 uv = v_uv;
    vec3 color = aurora(uv, iTime);
    vec4 texColor = texture2D(u_map, vUv);
    gl_FragColor = vec4(color * texColor.rgb, texColor.a);
}
`;

function selectTargetMesh(doorGroup) {
  if (!doorGroup || !doorGroup.traverse) return null;
  let smallest = null;
  let smallestArea = Infinity;
  doorGroup.traverse((c) => {
    if (c.isMesh && c.geometry) {
      // Prefer meshes likely to be text by name
      if (c.name && c.name.toLowerCase().includes("text")) {
        smallest = c;
        smallestArea = 0; // force immediate selection
        return;
      }
      if (c.material && c.material.opacity === 0) return;
      c.geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      c.geometry.boundingBox.getSize(size);
      const area = Math.abs(size.x * size.y);
      if (area < smallestArea) {
        smallestArea = area;
        smallest = c;
      }
    }
  });
  return smallest;
}

export default function WormholeEffect({ doorRefs, active = true, visible = true }) {
  const doors = doorRefs?.current || [];

  const shaderMatsRef = useRef([0, 1, 2].map(() =>
    new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_map: { value: null }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  ));

  const originalMaterialsRef = useRef({});

  useEffect(() => {
    doors.forEach((doorGroup, i) => {
      if (doorGroup) {
        const targetMesh = selectTargetMesh(doorGroup);
        if (targetMesh && shaderMatsRef.current[i]) {
          if (!originalMaterialsRef.current[i]) {
            originalMaterialsRef.current[i] = targetMesh.material;
          }
          targetMesh.material = shaderMatsRef.current[i];
          if (targetMesh.material && originalMaterialsRef.current[i].map) {
            shaderMatsRef.current[i].uniforms.u_map.value = originalMaterialsRef.current[i].map;
          }
        }
      }
    });
  }, [doors]);

  useFrame(({ clock, size }) => {
    shaderMatsRef.current.forEach((mat, i) => {
      mat.uniforms.iTime.value = clock.elapsedTime;
      mat.uniforms.iResolution.value.set(size.width, size.height);
      mat.visible = !!(active && visible);

      const doorGroup = doors[i];
      if (doorGroup) {
        const targetMesh = selectTargetMesh(doorGroup);
        if (targetMesh) {
          if (!originalMaterialsRef.current[i]) {
            originalMaterialsRef.current[i] = targetMesh.material;
          }
          if (active && visible) {
            if (targetMesh.material !== mat) {
              targetMesh.material = mat;
              if (originalMaterialsRef.current[i].map) {
                mat.uniforms.u_map.value = originalMaterialsRef.current[i].map;
              }
            }
          } else {
            if (originalMaterialsRef.current[i] && targetMesh.material !== originalMaterialsRef.current[i]) {
              targetMesh.material = originalMaterialsRef.current[i];
            }
          }
        }
      }
    });
  });

  useEffect(() => {
    return () => {
      Object.entries(originalMaterialsRef.current).forEach(([i, orig]) => {
        const doorGroup = doors[i];
        if (doorGroup) {
          const targetMesh = selectTargetMesh(doorGroup);
          if (targetMesh) targetMesh.material = orig;
        }
      });
      shaderMatsRef.current.forEach((m) => m.dispose());
    };
  }, [doors]);

  return null;
}