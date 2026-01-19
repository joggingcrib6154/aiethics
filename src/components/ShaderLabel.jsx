import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function ShaderLabel({ 
  text, 
  colorType = 'green', // 'green', 'blue', or 'red'
  style = {}
}) {
  const elementRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    let animationId;
    let time = 0;

    const animate = () => {
      time += 0.02;
      
      // Get base colors (dark green, dark red, dark blue)
      let baseColor;
      switch(colorType) {
        case 'green':
          baseColor = { r: 0.0, g: 0.4, b: 0.0 }; // Dark green
          break;
        case 'blue':
          baseColor = { r: 0.0, g: 0.0, b: 0.5 }; // Dark blue
          break;
        case 'red':
          baseColor = { r: 0.5, g: 0.0, b: 0.0 }; // Dark red
          break;
        default:
          baseColor = { r: 0.7, g: 0.7, b: 0.7 };
      }

      // Subtle pulsing and color variation (keep it subtle for dark colors)
      const pulse = Math.sin(time * 1.0) * 0.05 + 0.95;
      const variation = Math.sin(time * 0.5) * 0.05;
      
      // Calculate final color with subtle brightness variation
      const brightness = pulse + variation;
      const r = Math.min(255, Math.max(0, (baseColor.r * brightness) * 255));
      const g = Math.min(255, Math.max(0, (baseColor.g * brightness) * 255));
      const b = Math.min(255, Math.max(0, (baseColor.b * brightness) * 255));
      
      // Keep colors dark but readable
      element.style.color = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [colorType]);

  return (
    <span ref={elementRef} style={style}>
      {text}
    </span>
  );
}
