import React, { useRef } from 'react';
import MaskGrid from './MaskGrid';
import html2canvas from 'html2canvas';
import { Canvas } from '@react-three/fiber';
import BackgroundShaders from './BackgroundShaders';

function EndScreen({ choices, finalBadge }) {
  const maskRef = useRef();

  const handleDownload = async () => {
    const canvas = await html2canvas(maskRef.current);
    const link = document.createElement('a');
    link.download = 'final-mask.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <Canvas className="absolute inset-0">
        <BackgroundShaders />
      </Canvas>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div ref={maskRef} className="transform scale-125 mb-6">
          <MaskGrid choices={choices} />
        </div>
        <h2 className="text-3xl font-bold mb-2">You are: {finalBadge}</h2>
        <p className="opacity-80 mb-6">
          Your journey has shaped this mask and revealed your true archetype.
        </p>
        <button 
          onClick={handleDownload} 
          className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          Download Your Mask
        </button>
      </div>
    </div>
  );
}

export default EndScreen;