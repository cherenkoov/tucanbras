'use client'

import { useEffect, useRef, useState } from 'react'
import ChristScene from './ChristScene'
import { injectRailPath, splitSvgLayers } from './utils/injectRailPath'
import { useTrainAnimation } from './useTrainAnimation'
import { useCarAnimation } from './useCarAnimation'
import { useCloudAnimation } from './useCloudAnimation'
import { useBushAnimation } from './useBushAnimation'

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
  const [cloudsSvg, setCloudsSvg] = useState('')
  const [mainSvg, setMainSvg]     = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/SVG/background/background [Vectorized].svg')
      .then(r => r.text())
      .then(raw => {
        const { clouds, main } = splitSvgLayers(injectRailPath(raw))
        setCloudsSvg(clouds)
        setMainSvg(main)
      })
      .catch(err => console.warn('BackgroundCanvas: SVG fetch failed', err))
  }, [])

  const svgReady = !!(cloudsSvg && mainSvg)
  useTrainAnimation(containerRef, { enabled: svgReady })
  useCarAnimation(containerRef, { enabled: svgReady })
  useCloudAnimation(containerRef, { enabled: svgReady })
  useBushAnimation(containerRef, { enabled: svgReady })

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full z-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      {!svgReady && <Placeholder />}
      {cloudsSvg && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: -2 }} dangerouslySetInnerHTML={{ __html: cloudsSvg }} />
      )}
      {mainSvg && (
        <div style={{ position: 'relative', zIndex: 0 }} dangerouslySetInnerHTML={{ __html: mainSvg }} />
      )}

      {/* ChristScene anchored to mountain peak (SVG x≈512/800=64%, y≈488/2430=20.1%).
          translateY(-100%+15px) places the scene bottom 15px below the peak tip. */}
      <div
        className="absolute"
        style={{ left: '76%', top: '17.7%', transform: 'translate(-50%, calc(-100% + 15px))', zIndex: -1 }}
      >
        <ChristScene />
      </div>
    </div>
  )
}
