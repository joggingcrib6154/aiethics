import React from 'react';

export default function TimelineControls({ total, current, maxReached, onSelect }) {
    return (
        <div
            className="timeline-container"
            style={{
                position: 'absolute',
                bottom: '2rem',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20,
                pointerEvents: 'auto'
            }}>
            {Array.from({ length: total }).map((_, i) => {
                const isCurrent = i === current;
                const isReached = i <= maxReached;
                return (
                    <button
                        key={i}
                        className="timeline-dot"
                        onClick={() => isReached && onSelect(i)}
                        disabled={!isReached}
                        style={{
                            borderRadius: '9999px',
                            transition: 'all 0.3s ease',
                            border: 'none',
                            outline: 'none',
                            cursor: isReached ? 'pointer' : 'not-allowed',
                            backgroundColor: isCurrent ? '#00ffcc' : (isReached ? 'rgba(0, 255, 204, 0.3)' : 'rgba(255, 255, 255, 0.1)'),
                            opacity: 1,
                            transform: isCurrent ? 'scale(1.2)' : 'none',
                            boxShadow: isCurrent ? '0 0 15px rgba(0,255,204,0.6)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (isReached && !isCurrent) e.currentTarget.style.backgroundColor = 'rgba(0, 255, 204, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            if (isReached && !isCurrent) e.currentTarget.style.backgroundColor = 'rgba(0, 255, 204, 0.3)';
                        }}
                    />
                );
            })}
        </div>
    );
}
