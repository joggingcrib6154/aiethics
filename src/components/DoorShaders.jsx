import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
#define PI 3.14152965
#define PI2 (PI*2.)
#define HALF_PI (PI*0.5)
#define QUARTER_PI (PI*0.25)

uniform float iTime;
uniform vec2 iResolution;
varying vec2 vUv;

const float zoom = 1.;
const float door_aspect = 1.75;
const float spiral_rate = 1.75;
const float speed = 1.5;

void main() {
    vec2 fragCoord = vUv * iResolution;
    vec2 uv = (2.*fragCoord - iResolution.xy) / iResolution.y;
    
    uv.y /= door_aspect;
    float r = length(uv);
    float theta = atan(uv.y,uv.x);
    
    float phi = mod(theta+QUARTER_PI,HALF_PI)-QUARTER_PI;
    float square = r*zoom*cos(phi);
    
    float spiral = mod(1./(square*spiral_rate) + theta/PI2 + iTime*speed,1.0);
    spiral = step(spiral,min(square,0.2));

    vec3 col = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(r,2.0,4.0));
    vec3 spiralColor = col * spiral;
    vec3 glow = col + 1.0;
    
    col = mix(spiralColor,glow,clamp(1.0-square*5.0+(sin(iTime*0.1)+1.0)*0.1,0.0,1.0));

    gl_FragColor = vec4(col,1.0);
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
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      blending: THREE.NormalBlending
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
          targetMesh.needsUpdate = true;
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
          if (targetMesh.material !== mat) {
            targetMesh.material = mat;
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