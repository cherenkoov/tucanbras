'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ChristScene from './ChristScene'
import { injectRailPath } from './utils/injectRailPath'
import { useTrainAnimation } from './useTrainAnimation'
import { useCarAnimation } from './useCarAnimation'
import { useCloudAnimation } from './useCloudAnimation'
import { useBushAnimation } from './useBushAnimation'

function Placeholder() {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '800 / 2047',
        background: 'linear-gradient(to bottom, #c8bfb0 0%, #b5a898 40%, #8a9e7a 70%)',
      }}
    />
  )
}

export default function BackgroundCanvas() {
  const [mainSvg, setMainSvg] = useState('')
  const [peakPos, setPeakPos] = useState<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/SVG/background/background [Vectorized].svg')
      .then(r => r.text())
      .then(raw => setMainSvg(injectRailPath(raw)))
      .catch(err => console.warn('BackgroundCanvas: SVG fetch failed', err))
  }, [])

  const svgReady = !!mainSvg

  // Recalculate ChristScene anchor whenever container or window resizes
  const updatePeakPos = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const peak = container.querySelector<SVGElement>('#Peak')
    if (!peak) return
    const containerRect = container.getBoundingClientRect()
    const peakRect = peak.getBoundingClientRect()
    setPeakPos({
      // horizontal: 2/5 from left edge (ratio 2:3)
      x: peakRect.left - containerRect.left + peakRect.width * (2 / 5),
      // vertical: top of Peak + 15px so Pedestal overlaps 15px into Peak
      y: peakRect.top - containerRect.top + 15,
    })
  }, [])

  useEffect(() => {
    if (!svgReady) return
    updatePeakPos()
    const ro = new ResizeObserver(updatePeakPos)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [svgReady, updatePeakPos])

  useTrainAnimation(containerRef, { enabled: svgReady })
  useCarAnimation(containerRef, { enabled: svgReady })
  useCloudAnimation(containerRef, { enabled: svgReady })
  useBushAnimation(containerRef, { enabled: svgReady })

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full pointer-events-none"
      style={{ overflow: 'visible', isolation: 'isolate' }}
    >
      {!svgReady && <Placeholder />}
      {mainSvg && (
        <div dangerouslySetInnerHTML={{ __html: mainSvg }} />
      )}

      {/* ChristScene: bottom-center anchored to top-center of #Peak, 15px overlap */}
      {peakPos && (
        <div
          className="absolute"
          style={{
            left: peakPos.x,
            top: peakPos.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 5,
          }}
        >
          <ChristScene />
        </div>
      )}
    </div>
  )
}
