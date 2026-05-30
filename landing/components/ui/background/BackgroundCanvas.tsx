'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ChristScene from './ChristScene'
import { injectRailPath } from './utils/injectRailPath'
import { useTrainAnimation } from './useTrainAnimation'
import { useCarAnimation } from './useCarAnimation'
import { useCloudAnimation } from './useCloudAnimation'
import { useBushAnimation } from './useBushAnimation'
import { useBigTreeAnimation } from './useBigTreeAnimation'

function Placeholder() {
  return (
    <div
      style={{
        width: '100%',
        aspectRatio: '800 / 2047',
        background: 'var(--color-cream)',
      }}
    />
  )
}

function extractGroup(svgString: string, groupId: string): { inner: string; without: string } {
  const start = svgString.indexOf(`<g id="${groupId}"`)
  if (start === -1) return { inner: '', without: svgString }
  let depth = 0, i = start, end = -1
  while (i < svgString.length) {
    const openIdx = svgString.indexOf('<g', i)
    const closeIdx = svgString.indexOf('</g>', i)
    if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) { depth++; i = openIdx + 2 }
    else { depth--; i = closeIdx + 4; if (depth === 0) { end = i; break } }
  }
  if (end === -1) return { inner: '', without: svgString }
  return { inner: svgString.substring(start, end), without: svgString.substring(0, start) + svgString.substring(end) }
}

function wrapSvg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 800 2047" overflow="visible">${inner}</svg>`
}

// Groups lifted into a front layer ABOVE the train (z:7), in back→front paint order.
// Train overlay is z:6; everything left in mainSvg (z:2) stays below it. Net result:
// train runs UNDER {Slope 1, Mount Forest 1, Peak, Mount forest 2, Slope 2, Group 1,
// Mount forest 4, City, bushes, Big tree} and OVER {Mount forest 3, road group, Slope 3, …}.
const FRONT_IDS = [
  'Slope 1', 'Mount Forest 1', 'Peak', 'Mount forest 2', 'Slope 2', 'Group 1',
  'Mount forest 4', 'City', 'bush 02', 'bush 01', // bush 03 is inside City; Big tree is its own layer (sway)
]

export default function BackgroundCanvas() {
  const [mainSvg, setMainSvg] = useState('')
  const [citySvg, setCitySvg] = useState('')
  const [frontSvg, setFrontSvg] = useState('')
  const [bigTreeSvg, setBigTreeSvg] = useState('')
  const [peakPos, setPeakPos] = useState<{ x: number; y: number } | null>(null)
  const [entered, setEntered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bigTreeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/SVG/background/background [Vectorized] 2.svg')
      .then(r => r.text())
      .then(raw => {
        const { inner: cityInner, without: s0 } = extractGroup(raw, 'Background city')
        if (cityInner) setCitySvg(wrapSvg(cityInner))

        // Lift the front-set groups out of the main SVG into their own layer (z:7, above the train)
        let s = s0
        let frontInner = ''
        for (const id of FRONT_IDS) {
          const { inner, without } = extractGroup(s, id)
          frontInner += inner
          s = without
        }
        if (frontInner) setFrontSvg(wrapSvg(frontInner))

        // Big tree gets its own layer so the sway can rotate the wrapper div
        // (rotating a <g> inside dangerouslySetInnerHTML doesn't take visually)
        const { inner: bigTree, without: s1 } = extractGroup(s, 'Big tree')
        if (bigTree) setBigTreeSvg(wrapSvg(bigTree))
        s = s1

        setMainSvg(injectRailPath(s))
      })
      .catch(err => console.warn('BackgroundCanvas: SVG fetch failed', err))
  }, [])

  const svgReady = !!mainSvg

  // Trigger entrance animation after SVG is rendered to DOM
  useEffect(() => {
    if (!svgReady) return
    let id1: number, id2: number
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setEntered(true))
    })
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2) }
  }, [svgReady])

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
      y: peakRect.top - containerRect.top + 25,
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
  useBigTreeAnimation(bigTreeRef, { enabled: !!bigTreeSvg })

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-full pointer-events-none"
      style={{
        overflow: 'visible',
        isolation: 'isolate',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(80px)',
        transition: 'opacity 1.4s ease, transform 1.4s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {!svgReady && <Placeholder />}
      {citySvg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}
          dangerouslySetInnerHTML={{ __html: citySvg }}
        />
      )}
      {mainSvg && (
        <div style={{ position: 'relative', zIndex: 2 }} dangerouslySetInnerHTML={{ __html: mainSvg }} />
      )}

      {/* Front layer — above the train (z:6), below the statue (z:8) */}
      {frontSvg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 7 }}
          dangerouslySetInnerHTML={{ __html: frontSvg }}
        />
      )}

      {/* Big tree — own layer (on top of the front-set) so the sway rotates this div */}
      {bigTreeSvg && (
        <div
          ref={bigTreeRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 7 }}
          dangerouslySetInnerHTML={{ __html: bigTreeSvg }}
        />
      )}

      {/* ChristScene: bottom-center anchored to top-center of #Peak, 15px overlap */}
      {peakPos && (
        <div
          className="absolute"
          style={{
            left: peakPos.x,
            top: peakPos.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 8,
          }}
        >
          <ChristScene />
        </div>
      )}
    </div>
  )
}
