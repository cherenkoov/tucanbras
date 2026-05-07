'use client'

import ChristScene from './ChristScene'

export default function BackgroundCanvas() {
  return (
    <div
      className="absolute top-0 left-0 w-full z-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {/* Sharp background — natural image height, no parallax */}
      <img
        alt=""
        src="/PNG/background/background.png"
        className="w-full h-auto block"
        draggable={false}
      />

      {/* Blurred overlay — gradient mask ties blur to image coordinates */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 25%, black 65%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 25%, black 65%)',
          overflow: 'hidden',
        }}
      >
        <img
          alt=""
          src="/PNG/background/background.png"
          className="w-full h-auto block"
          style={{ filter: 'blur(10px)', transform: 'scale(1.02)' }}
          draggable={false}
        />
      </div>

      {/* Christ scene — positioned at mountain peak */}
      <div
        className="absolute"
        style={{ left: '62%', top: '1.5%', transform: 'translateX(-50%)' }}
      >
        <ChristScene />
      </div>
    </div>
  )
}
