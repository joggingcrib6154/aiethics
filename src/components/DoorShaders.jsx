import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform sampler2D u_map;
uniform int u_hasMap;
varying vec2 v_uv;

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = rand(i);
  float b = rand(i + vec2(1.0, 0.0));
  float c = rand(i + vec2(0.0, 1.0));
  float d = rand(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = v_uv * u_resolution.xy / min(u_resolution.x, u_resolution.y);
  float time = u_time * 0.5;

  float n = noise(vec2(uv.x * 3.0, uv.y * 3.0 + time));
  float glow = smoothstep(0.4, 0.6, n);

  vec3 color = mix(vec3(0.0, 0.0, 0.1), vec3(0.0, 0.7, 0.9), glow);
  color += vec3(0.1, 0.3, 0.5) * glow * 0.5;

  gl_FragColor = vec4(color, 1.0);

  if (u_hasMap > 0) {
    vec4 glyph = texture2D(u_map, v_uv);
    gl_FragColor.a *= glyph.a;
    if (gl_FragColor.a < 0.01) discard;
  }
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
  const mouseRef = useRef(new THREE.Vector2(0, 0));

  const shaderMatsRef = useRef([0, 1, 2].map(() =>
    new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_map: { value: null },
        u_hasMap: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending
    })
  ));

  const originalMaterialsRef = useRef({});

  useEffect(() => {
    doors.forEach((doorGroup, i) => {
      if (doorGroup) {
        const targetMesh = selectTargetMesh(doorGroup);
        if (targetMesh && shaderMatsRef.current[i]) {
            const shaderMat = shaderMatsRef.current[i];
          
            if (!originalMaterialsRef.current[i]) {
              originalMaterialsRef.current[i] = targetMesh.material;
            }
          
            if (targetMesh.material.map) {
              // Glyph atlas ready, safe to swap
              shaderMat.uniforms.u_map.value = targetMesh.material.map;
              shaderMat.uniforms.u_hasMap.value = 1;
              targetMesh.material = shaderMat;
              targetMesh.needsUpdate = true;
            } else {
              // Poll until map is ready
              let tries = 0;
              const pollId = setInterval(() => {
                tries++;
                if (targetMesh.material && targetMesh.material.map) {
                  shaderMat.uniforms.u_map.value = targetMesh.material.map;
                  shaderMat.uniforms.u_hasMap.value = 1;
                  targetMesh.material = shaderMat;
                  targetMesh.needsUpdate = true;
                  clearInterval(pollId);
                }
                if (tries > 50) clearInterval(pollId); // fail-safe
              }, 100);
            }
          }
      }
    });
  }, [doors]);

  useFrame(({ clock, size }) => {
    shaderMatsRef.current.forEach((mat, i) => {
      mat.uniforms.u_time.value = clock.elapsedTime;
      mat.uniforms.u_resolution.value.set(size.width, size.height);
      mat.uniforms.u_mouse.value.copy(mouseRef.current);
      mat.visible = !!(active && visible);

      const doorGroup = doors[i];
      if (doorGroup) {
        const targetMesh = selectTargetMesh(doorGroup);
        if (targetMesh) {
          if (!originalMaterialsRef.current[i]) {
            originalMaterialsRef.current[i] = targetMesh.material;
          }
          // Removed material reassignment here as per instructions
          // if (targetMesh.material !== mat) {
          //   targetMesh.material = mat;
          // }
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