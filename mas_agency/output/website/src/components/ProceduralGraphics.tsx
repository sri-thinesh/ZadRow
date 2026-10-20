import React from 'react';

export function ProceduralGraphics() {
  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      {/* Subtle geometric grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Decorative procedural framing lines */}
      <svg
        className="absolute top-0 left-0 w-64 h-64 opacity-20"
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 64H64V0" stroke="#00f0ff" strokeWidth="1" />
        <circle cx="64" cy="64" r="2" fill="#00f0ff" />
      </svg>

      <svg
        className="absolute bottom-0 right-0 w-64 h-64 opacity-20"
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M256 192H192V256" stroke="#00f0ff" strokeWidth="1" />
        <circle cx="192" cy="192" r="2" fill="#00f0ff" />
      </svg>
    </div>
  );
}
