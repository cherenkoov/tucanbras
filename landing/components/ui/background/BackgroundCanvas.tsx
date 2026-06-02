'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ChristScene from './ChristScene'
import { injectRailPath } from './utils/injectRailPath'
import { useTrainAnimation } from './useTrainAnimation'
import { useCarAnimation } from './useCarAnimation'
import { useCloudAnimation } from './useCloudAnimation'
import { useBushAnimation } from './useBushAnimation'
import { useBigTreeAnimation } from './useBigTreeAnimation'
import { useHumanAnimation } from './useHumanAnimation'
import { HUMANS } from './humanPaths'

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
  'Mount forest 4', 'City', // bush 03 is inside City; bush 01/02 and Big tree are their own animated layers
  // NOTE: house 1..11 and human 1..4 are all NESTED inside the `City` group. The
  // figures + house 4/6 are pulled OUT of City (below) before City is lifted here,
  // so the remaining houses (1,2,3,5,7,8,9,10,11) ride along into the front layer —
  // which is exactly where the figures must sit behind them.
]

export default function BackgroundCanvas() {
  const [mainSvg, setMainSvg] = useState('')
  const [citySvg, setCitySvg] = useState('')
  const [frontSvg, setFrontSvg] = useState('')
  const [bigTreeSvg, setBigTreeSvg] = useState('')
  const [bush01Svg, setBush01Svg] = useState('')
  const [bush02Svg, setBush02Svg] = useState('')
  const [house4Svg, setHouse4Svg] = useState('')
  const [house6Svg, setHouse6Svg] = useState('')
  const [humanSvgs, setHumanSvgs] = useState<string[]>(['', '', '', ''])
  const [peakPos, setPeakPos] = useState<{ x: number; y: number } | null>(null)
  const [entered, setEntered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const bigTreeRef = useRef<HTMLDivElement>(null)
  const bush01Ref = useRef<HTMLDivElement>(null)
  const bush02Ref = useRef<HTMLDivElement>(null)
  const human1Ref = useRef<HTMLDivElement>(null)
  const human2Ref = useRef<HTMLDivElement>(null)
  const human3Ref = useRef<HTMLDivElement>(null)
  const human4Ref = useRef<HTMLDivElement>(null)
  // Stable array (index matches HUMANS order) for the animation hook.
  const humanRefs = useMemo(
    () => [human1Ref, human2Ref, human3Ref, human4Ref],
    []
  )

  useEffect(() => {
    fetch('/SVG/background/background [Vectorized] 2.svg')
      .then(r => r.text())
      .then(raw => {
        const { inner: cityInner, without: s0 } = extractGroup(raw, 'Background city')
        if (cityInner) setCitySvg(wrapSvg(cityInner))

        // Pull the figures + their two occlusion houses OUT of `City` FIRST (all of
        // house 1..11 and human 1..4 are nested inside the `City` group). They must
        // leave City before it is lifted to the front layer below.
        let s = s0

        // house 6 (own layer z3) and house 4 (own layer z5) — dynamic occlusion targets
        const { inner: house6, without: sh6 } = extractGroup(s, 'house 6')
        if (house6) setHouse6Svg(wrapSvg(house6))
        s = sh6
        const { inner: house4, without: sh4 } = extractGroup(s, 'house 4')
        if (house4) setHouse4Svg(wrapSvg(house4))
        s = sh4

        // human 1–4 — each its own animated wrapper-div layer
        const humanInner: string[] = []
        for (const cfg of HUMANS) {
          const { inner, without } = extractGroup(s, cfg.id)
          humanInner.push(inner ? wrapSvg(inner) : '')
          s = without
        }
        setHumanSvgs(humanInner)

        // Lift the front-set groups out of the main SVG into their own layer (z:7, above the train)
        let frontInner = ''
        for (const id of FRONT_IDS) {
          const { inner, without } = extractGroup(s, id)
          frontInner += inner
          s = without
        }
        if (frontInner) setFrontSvg(wrapSvg(frontInner))

        // bush 01 / bush 02 get their own layers so the slide-in can transform the wrapper div
        const { inner: bush02, without: sb2 } = extractGroup(s, 'bush 02')
        if (bush02) setBush02Svg(wrapSvg(bush02))
        s = sb2
        const { inner: bush01, without: sb1 } = extractGroup(s, 'bush 01')
        if (bush01) setBush01Svg(wrapSvg(bush01))
        s = sb1

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
    let id2: number
    const id1 = requestAnimationFrame(() => {
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
  useBushAnimation(bush01Ref, bush02Ref, { enabled: svgReady })
  useBigTreeAnimation(bigTreeRef, { enabled: !!bigTreeSvg })
  useHumanAnimation(containerRef, humanRefs, { enabled: svgReady, debug: false })

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

      {/* house 6 — own layer (z3): figures pass in front of it by default */}
      {house6Svg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 3 }}
          dangerouslySetInnerHTML={{ __html: house6Svg }}
        />
      )}

      {/* human 1–4 — own animated layers (baseZ from HUMANS; hook drives transform + z) */}
      {humanSvgs.map((svg, i) =>
        svg ? (
          <div
            key={HUMANS[i].id}
            ref={humanRefs[i]}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: HUMANS[i].baseZ }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null
      )}

      {/* house 4 — own layer (z5): figures pass behind it by default, in front on toggle */}
      {house4Svg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 5 }}
          dangerouslySetInnerHTML={{ __html: house4Svg }}
        />
      )}

      {/* Front layer — above the train (z:6), below the statue (z:8) */}
      {frontSvg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 7 }}
          dangerouslySetInnerHTML={{ __html: frontSvg }}
        />
      )}

      {/* bush 02 then bush 01 — own layers (above City, below Big tree) for the slide-in */}
      {bush02Svg && (
        <div
          ref={bush02Ref}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 7 }}
          dangerouslySetInnerHTML={{ __html: bush02Svg }}
        />
      )}
      {bush01Svg && (
        <div
          ref={bush01Ref}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 7 }}
          dangerouslySetInnerHTML={{ __html: bush01Svg }}
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
