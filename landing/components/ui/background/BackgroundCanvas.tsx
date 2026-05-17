'use client'

import { useEffect, useRef, useState } from 'react'
import ChristScene from './ChristScene'
import { injectRailPath } from './utils/injectRailPath'
import { useParallaxBackground } from './useParallaxBackground'

function Placeholder() {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '800 / 2430',
        background: 'linear-gradient(to bottom, #1a2a4a 0%, #2a5298 15%, #1e3a6e 40%, #1a3a0d 70%)',
      }}
    />
  )
}

export default function BackgroundCanvas() {
  const [svgContent, setSvgContent] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/SVG/background/background [Vectorized].svg')
      .then(r => r.text())
      .then(raw => setSvgContent(injectRailPath(raw)))
      .catch(err => console.warn('BackgroundCanvas: SVG fetch failed', err))
  }, [])

  useParallaxBackground(containerRef, { enabled: !!svgContent })

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full z-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {!svgContent && <Placeholder />}
      {svgContent && (
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      )}

      {/* ChristScene sits on top of SVG, position matches mountain peak */}
      <div
        className="absolute"
        style={{ left: '72%', top: '5%', transform: 'translateX(-50%)' }}
      >
        <ChristScene />
      </div>
    </div>
  )
}
