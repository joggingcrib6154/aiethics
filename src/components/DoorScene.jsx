import React, { useState } from 'react';

export default function DoorScene({ onChoice }) {
  const [animating, setAnimating] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const handleClick = (index) => {
    setSelectedIndex(index);
    setAnimating(true);
    setTimeout(() => {
      setAnimating(false);
      onChoice(index);
    }, 800);
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center gap-8">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            onClick={() => handleClick(index)}
            className={`w-24 h-40 bg-gray-600 rounded transition-transform duration-700 ease-in-out cursor-pointer origin-center ${
              animating && selectedIndex === index ? 'scale-[30] z-50' : ''
            }`}
          />
        ))}
      </div>

      {animating && (
        <div className="fixed inset-0 bg-black opacity-70 transition-opacity duration-700 z-40 pointer-events-none" />
      )}
    </div>
  );
}
