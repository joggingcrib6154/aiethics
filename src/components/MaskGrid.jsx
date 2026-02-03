import React from 'react';

export default function MaskGrid({ choices = [] }) {
  const tileSize = 96;
  const totalTiles = 20;

  const fragments = Array.from({ length: totalTiles }, (_, i) => {
    const choice = choices[i]?.index;
    if (choice !== undefined && [0, 1, 2].includes(choice)) {
      const questionNum = i + 1;
      const letter = ['a', 'b', 'c'][choice];
      return `${questionNum}${letter}.png`;
    }
    return null;
  });

  return (
    <div
      className="mask-grid"
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
              src={`/aiethics/maskfrags/${filename}`}
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

export async function downloadMaskGrid(choices) {
  console.log('=== Starting downloadMaskGrid ===');
  console.log('Choices:', choices);
  
  try {
    const cols = 4;
    const rows = 5;
    const tile = 96; // Original tile size in pixels
    const W = cols * tile;
    const H = rows * tile;

    if (!choices || !Array.isArray(choices)) {
      console.error('downloadMaskGrid: invalid choices');
      alert('Invalid choices data');
      return;
    }

    // Build export canvas with higher resolution (4x scale for better quality)
    const scale = 4;
    const out = document.createElement('canvas');
    out.width = W * scale;
    out.height = H * scale;
    const ctx = out.getContext('2d');

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Transparent background (no dark background)
    ctx.clearRect(0, 0, out.width, out.height);

    console.log(`Canvas created: ${out.width}x${out.height}`);

    // Collect images to load
    const imagesToLoad = [];
    for (let i = 0; i < rows * cols; i++) {
      const v = choices[i];
      const idx = typeof v === 'number' ? v : v?.index;
      if (idx === 0 || idx === 1 || idx === 2) {
        const q = i + 1;
        const letter = ['a','b','c'][idx];
        const src = `/aiethics/maskfrags/${q}${letter}.png`;
        imagesToLoad.push({ i, src });
      }
    }

    console.log(`Will load ${imagesToLoad.length} images:`, imagesToLoad.map(x => x.src));

    if (imagesToLoad.length === 0) {
      alert('No mask fragments to download. Make sure you have made some choices!');
      return;
    }

    // Load all images
    const loadedImages = await Promise.all(
      imagesToLoad.map(({ i, src }) =>
        new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Enable CORS for image manipulation
          img.onload = () => {
            console.log('✓ Loaded:', src);
            resolve({ i, img, success: true });
          };
          img.onerror = (e) => {
            console.error('✗ Failed:', src, e);
            resolve({ i, img: null, success: false });
          };
          img.src = src;
        })
      )
    );

    const successfulImages = loadedImages.filter(x => x.success);
    console.log(`Successfully loaded ${successfulImages.length}/${imagesToLoad.length} images`);

    if (successfulImages.length === 0) {
      alert('Failed to load any mask images. Check the console for details.');
      return;
    }

    // Draw images on canvas - seamlessly connected, no borders
    successfulImages.forEach(({ i, img }) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const dx = col * tile * scale;
      const dy = row * tile * scale;
      
      // Draw image at exact position with no gaps or borders
      // This ensures seamless connection between tiles
      ctx.drawImage(img, dx, dy, tile * scale, tile * scale);
      console.log(`Drew image at position (${col}, ${row})`);
    });

    // Apply brightness enhancement to the entire canvas
    const imageData = ctx.getImageData(0, 0, out.width, out.height);
    const data = imageData.data;
    
    // Brightness multiplier (1.0 = no change, 1.2 = 20% brighter)
    const brightnessMultiplier = 1.3;
    
    for (let i = 0; i < data.length; i += 4) {
      // Only adjust non-transparent pixels
      if (data[i + 3] > 0) {
        // Apply brightness to RGB channels
        data[i] = Math.min(255, data[i] * brightnessMultiplier);     // R
        data[i + 1] = Math.min(255, data[i + 1] * brightnessMultiplier); // G
        data[i + 2] = Math.min(255, data[i + 2] * brightnessMultiplier); // B
        // Alpha channel (data[i + 3]) remains unchanged
      }
    }
    
    // Put the enhanced image data back
    ctx.putImageData(imageData, 0, 0);

    console.log('All images drawn and enhanced. Creating blob...');

    // Download
    out.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob');
        alert('Failed to create download blob');
        return;
      }
      
      console.log('Blob created, size:', blob.size, 'bytes');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai_ethics_mask.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('=== Download complete ===');
    }, 'image/png', 1.0); // Maximum quality
  } catch (e) {
    console.error('downloadMaskGrid failed:', e);
    alert('Error creating mask download: ' + e.message);
  }
}
