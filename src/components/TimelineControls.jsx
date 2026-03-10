import React from 'react';

export default function TimelineControls({ total, current, maxReached, onSelect }) {
    return (
        <div style={{
            position: 'absolute',
            bottom: '2rem',
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            zIndex: 20,
            pointerEvents: 'auto'
        }}>
            {Array.from({ length: total }).map((_, i) => {
                const isCurrent = i === current;
                const isReached = i <= maxReached;
                return (
                    <button
                        key={i}
                        onClick={() => isReached && onSelect(i)}
                        disabled={!isReached}
                        style={{
                            width: '3rem',
                            height: '0.5rem',
                            borderRadius: '9999px',
                            transition: 'all 0.3s ease',
                            border: 'none',
                            outline: 'none',
                            cursor: isReached ? 'pointer' : 'not-allowed',
                            backgroundColor: isCurrent ? 'white' : (isReached ? '#9ca3af' : '#374151'),
                            opacity: (!isCurrent && !isReached) ? 0.5 : 1,
                            transform: isCurrent ? 'scale(1.1)' : 'none',
                            boxShadow: isCurrent ? '0 0 10px rgba(255,255,255,0.8)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (isReached && !isCurrent) e.currentTarget.style.backgroundColor = '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                            if (isReached && !isCurrent) e.currentTarget.style.backgroundColor = '#9ca3af';
                        }}
                    />
                );
            })}
        </div>
    );
}
