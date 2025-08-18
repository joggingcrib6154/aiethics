import React from 'react';

export default function MaskGrid({ choices }) {
  const tileSize = 96;
  const totalTiles = 20;

  const fragments = Array.from({ length: totalTiles }, (_, i) => {
    const choice = choices[i];
    if (choice === 0 || choice === 1 || choice === 2) {
      const questionNum = i + 1;
      const letter = ['a', 'b', 'c'][choice];
      return `${questionNum}${letter}.png`;
    }
    return null;
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        transform: 'scale(0.5)',
        transformOrigin: 'top right',
        zIndex: 1000,
        display: 'grid',
        gridTemplateColumns: `repeat(4, ${tileSize}px)`,
        gridTemplateRows: `repeat(5, ${tileSize}px)`
      }}
    >
      {fragments.map((filename, i) => (
        <div
          key={`${i}-${filename ?? 'empty'}`}
          style={{
            width: `${tileSize}px`,
            height: `${tileSize}px`,
            boxSizing: 'border-box',
            border: '1px solid #374151',
            backgroundColor: '#111827',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {filename ? (
            <img
              key={filename}
              src={`/maskfrags/${filename}`}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                animation: 'fadeInScale 0.5s ease'
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#1f2937',
                color: '#4b5563',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              •
            </div>
          )}
        </div>
      ))}

      <style>
        {`
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.5);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  );
}
