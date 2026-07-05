'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ChristScene from './ChristScene'
import { injectRailPath, injectCloudAnimation } from './utils/injectRailPath'
import { useTrainAnimation } from './useTrainAnimation'
import { useCarAnimation } from './useCarAnimation'
import { useCloudAnimation } from './useCloudAnimation'
import { useBushAnimation } from './useBushAnimation'
import { useBigTreeAnimation } from './useBigTreeAnimation'
import { useHumanAnimation } from './useHumanAnimation'
import { HUMANS } from './humanPaths'
import { WavesAnimated } from '@/components/ui/WavesAnimated'
import { useBackgroundCoverage } from './useBackgroundCoverage'

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

// `main 2.svg` (the beach/boulevard scene) is a STANDALONE Figma export. Two problems
// to fix before inlining it next to the collage:
//
//  1) ID COLLISIONS. Figma numbers its auto-ids from the same base in every export
//     (clip0_0_1, paint0_linear_0_1, filter0_…), so the beach and the collage define
//     identical ids. In one DOM `url(#…)` resolves to the FIRST match — the collage,
//     painted above — so the beach's `clip-path="url(#clip0_0_1)"` grabbed the COLLAGE's
//     clip and the whole scene got clipped away, leaving only its backdrop rect (the
//     grey slab). We namespace every id + every reference (url(#…), [xlink:]href="#…")
//     with a unique prefix so the beach points only at its own defs.
//  2) FIXED SIZE. It keeps its OWN viewBox (1027×3614); we drop the fixed width/height
//     so it fills 100% width, derive height from the viewBox, and `display:block` to
//     kill the inline-SVG baseline gap so it sits flush under the collage.
//  3) OPAQUE BACKDROPS. Figma exports TWO full-frame backdrop rects behind the scene:
//     an outer <rect …fill="#1E1E1E"/> (the Figma frame) and an inner
//     <rect …fill="#77533E"/> (the brown ground added in the latest export). Both make
//     the beach opaque and would hide the wave layer behind it (z9), so we strip BOTH.
//     The brown is re-rendered as its OWN layer at z8 (BELOW the waves) — see the
//     `brownRef` backdrop in the JSX — so the beach keeps a solid brown base everywhere
//     while the animated waves still show through the transparent sea-gap. NB: the
//     <clipPath> ALSO holds a 1027×3614 rect, but with fill="white"; removing that one
//     clips the whole scene away (main2 vanishes), so the fill MUST be part of each match.
const BEACH_PREFIX = 'b2-'
// Brown ground stripped from the beach SVG and painted on its own z8 layer (below waves).
const BEACH_GROUND_COLOR = '#77533E'
function prepareBeachSvg(svgString: string): string {
  return svgString
    .replace(/\bid="([^"]+)"/g, `id="${BEACH_PREFIX}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${BEACH_PREFIX}$1)`)
    .replace(/((?:xlink:)?href)="#([^"]+)"/g, `$1="#${BEACH_PREFIX}$2"`)
    .replace(/<rect width="1027" height="3614" fill="#1E1E1E"\/>/g, '')
    .replace(/<rect width="1027" height="3614" fill="#77533E"\/>/g, '')
    .replace(
      /(<svg\b[^>]*?)\swidth="[^"]*"\s+height="[^"]*"/,
      '$1 width="100%" style="display:block"'
    )
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

// Clouds (Cloud 01–08 minus the absent Cloud 04), in SVG document order so their
// mutual overlap is preserved. Lifted into their own layer so the mobile descent
// can shift everything else WITHOUT moving the sky.
const CLOUD_IDS = ['Cloud 06', 'Cloud 07', 'Cloud 05', 'Cloud 03', 'Cloud 02', 'Cloud 01', 'Cloud 08']

// Mobile descent: everything EXCEPT the clouds slides down as the viewport narrows.
// 0px at ≥1024px → 400px at ≤375px, linear between (≈158px at 768px). 649 = 1024−375.
const BG_SHIFT = 'clamp(0px, calc((1024px - 100vw) * 400 / 649), 400px)'
// Equal-and-opposite value: cancels BG_SHIFT at every width so the clouds hold position.
// KEEP IN SYNC with BG_SHIFT: if you change a number above, mirror it here (negate the
// factor, flip the clamp bounds) or the clouds will drift instead of staying pinned.
const BG_SHIFT_NEG = 'clamp(-400px, calc((1024px - 100vw) * -400 / 649), 0px)'

// Decorative wave bands (moved OUT of the page flow into this background). They sit
// BEHIND the beach (z9 < main2's z10), STRETCHED to fill the gap between main2's
// `curb 3` (upper edge) and `curb` (lower edge) groups — the empty band the waves
// show through. Top + height recomputed on resize; WavesAnimated scales the band
// stack to that height. These two offsets EXPAND the band independently: the top edge
// rises by WAVES_TOP_OFFSET_PX and the bottom edge drops by WAVES_BOTTOM_OFFSET_PX (px).
const WAVES_TOP_OFFSET_PX = 120
const WAVES_BOTTOM_OFFSET_PX = 120

// ── Cover-zoom + coverage-parallax (spec 2026-06-28) ────────────────────────
// All four are visually tunable on a real device (spec §5).
// maxZoom 2.0: narrow/tall mobile pages (375/414) clamp here — a larger crop budget
// makes the illustration taller so less of the gap is left to the parallax + fill.
// focalX is overridden at runtime by the measured Christ-statue column (see the hook),
// so the crop keeps the statue centred; this value is only the pre-measure fallback.
const COVERAGE_CONFIG = {
  maxZoom: 2.0, focalX: 0.45, minP: 0.3,
  // Horizontal framing: statue centred on phones, eased to near the right edge on
  // tablets+ (mirroring the hero card). 0.5 = centre, 0.78 ≈ right edge. Ease-in over
  // [520, 768]px so phones stay centred and tablets (≥768) land at the right.
  focalAnchorNarrow: 0.5, focalAnchorWide: 0.78, focalAnchorStart: 520, focalAnchorEnd: 768,
}
// Terminal fill band colour — FALLBACK only. At runtime we rasterise the beach SVG and
// sample its actual bottom-edge colour (see `fillColor` state) so the band blends
// seamlessly with wherever the beach art ends; this value shows only until that resolves.
const TERMINAL_FILL_COLOR = '#ECDBB5'
// Lower the beach (main2) by this many px past its bush-01 anchor, spending part of its
// overlap reserve with the collage so more real beach/sea art sits below the fold.
// PURELY AESTHETIC now (how much beach to show) — NOT a space-filling device: coverage
// at the page bottom is handled by the deficit-driven parallax + terminal fill (see
// computeCoverage). Kept well inside the measured overlap so no collage↔beach gap opens.
const BEACH_LOWER_PX = 300

export default function BackgroundCanvas() {
  const [mainSvg, setMainSvg] = useState('')
  const [beachSvg, setBeachSvg] = useState('')
  const [citySvg, setCitySvg] = useState('')
  const [cloudsSvg, setCloudsSvg] = useState('')
  const [frontSvg, setFrontSvg] = useState('')
  const [bigTreeSvg, setBigTreeSvg] = useState('')
  const [bush01Svg, setBush01Svg] = useState('')
  const [bush02Svg, setBush02Svg] = useState('')
  const [roadsSvg, setRoadsSvg] = useState('')
  const [house4Svg, setHouse4Svg] = useState('')
  const [house5Svg, setHouse5Svg] = useState('')
  const [house6Svg, setHouse6Svg] = useState('')
  const [humanSvgs, setHumanSvgs] = useState<string[]>(['', '', '', ''])
  const [peakPos, setPeakPos] = useState<{ x: number; y: number } | null>(null)
  // Whole-scene upward lift (px) so the statue's head STARTS at the hero's top line.
  // Parallax then carries it down on scroll — hence a starting lift, not a fixed pin.
  const [sceneLift, setSceneLift] = useState(0)
  // Terminal-fill colour, sampled from the beach SVG's bottom edge (fallback until then).
  const [fillColor, setFillColor] = useState(TERMINAL_FILL_COLOR)
  const [entered, setEntered] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const christRef = useRef<HTMLDivElement>(null)
  const beachRef = useRef<HTMLDivElement>(null)
  const brownRef = useRef<HTMLDivElement>(null)
  const wavesRef = useRef<HTMLDivElement>(null)
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
    fetch('/SVG/background/background-collage.svg')
      .then(r => r.text())
      .then(raw => {
        const { inner: cityInner, without: s0 } = extractGroup(raw, 'Background city')
        if (cityInner) setCitySvg(wrapSvg(cityInner))

        // Pull the figures + their two occlusion houses OUT of `City` FIRST (all of
        // house 1..11 and human 1..4 are nested inside the `City` group). They must
        // leave City before it is lifted to the front layer below.
        let s = s0

        // house 6 (own layer z3), house 4 & house 5 (own layers z5) — figures interleave
        // by their per-figure z: human 1 (z6) in front, the others (z4) behind.
        const { inner: house6, without: sh6 } = extractGroup(s, 'house 6')
        if (house6) setHouse6Svg(wrapSvg(house6))
        s = sh6
        const { inner: house4, without: sh4 } = extractGroup(s, 'house 4')
        if (house4) setHouse4Svg(wrapSvg(house4))
        s = sh4
        const { inner: house5, without: sh5 } = extractGroup(s, 'house 5')
        if (house5) setHouse5Svg(wrapSvg(house5))
        s = sh5

        // Roads are nested in City too, but the figures must walk ON TOP of them.
        // Pull them out and render below the figures (z1, above the base terrain).
        let roadsInner = ''
        for (const id of ['road 1', 'road 2', 'road 3']) {
          const { inner, without } = extractGroup(s, id)
          roadsInner += inner
          s = without
        }
        if (roadsInner) setRoadsSvg(wrapSvg(roadsInner))

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

        // Clouds — own layer so the mobile descent leaves the sky pinned while
        // everything else shifts down. Extract in document order (overlap preserved).
        let cloudsInner = ''
        for (const id of CLOUD_IDS) {
          const { inner, without } = extractGroup(s, id)
          cloudsInner += inner
          s = without
        }
        if (cloudsInner) setCloudsSvg(injectCloudAnimation(wrapSvg(cloudsInner)))

        setMainSvg(injectRailPath(s))
      })
      .catch(err => console.warn('BackgroundCanvas: SVG fetch failed', err))
  }, [])

  // Beach scene (Scene 3, `main 2.svg`) — fetched separately and appended BELOW the
  // collage as a full-width in-flow block. Space in the filename → %20 in the URL.
  useEffect(() => {
    fetch('/SVG/background/main%202.svg')
      .then(r => r.text())
      .then(raw => setBeachSvg(prepareBeachSvg(raw)))
      .catch(err => console.warn('BackgroundCanvas: beach SVG fetch failed', err))
  }, [])

  // Sample the beach SVG's bottom-edge colour so the terminal fill band blends
  // seamlessly with wherever the beach art ends (no hard sea→sand seam). We rasterise
  // the (same-origin, self-contained) beach SVG small, read its bottom opaque row, and
  // average it. Falls back to TERMINAL_FILL_COLOR if the bottom row is transparent.
  useEffect(() => {
    if (!beachSvg) return
    const sized = beachSvg.replace('width="100%"', 'width="320"')
    const blob = new Blob([sized], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    let cancelled = false
    img.onload = () => {
      try {
        if (cancelled) return
        const w = img.naturalWidth || 320
        const h = img.naturalHeight || 1
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const cx = canvas.getContext('2d')
        if (!cx) return
        cx.drawImage(img, 0, 0)
        const row = cx.getImageData(0, Math.max(0, h - 2), w, 1).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < row.length; i += 4) {
          if (row[i + 3] > 200) { r += row[i]; g += row[i + 1]; b += row[i + 2]; n++ }
        }
        if (n > 0) {
          const hex = '#' + [r, g, b].map(v => Math.round(v / n).toString(16).padStart(2, '0')).join('')
          setFillColor(hex)
        }
      } catch { /* tainted/decoding — keep fallback */ } finally { URL.revokeObjectURL(url) }
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
    return () => { cancelled = true; URL.revokeObjectURL(url) }
  }, [beachSvg])

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
      // vertical: seat the pedestal base right on the crest — a small bite into Peak
      // so it reads as planted on the rim, not floating. (Was +25 = base sunk ~13px
      // below the crest; +12 lands the base on the crest, +15 keeps ~3px overlap.)
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

  // Lift the WHOLE scene up so the statue's head starts on the hero's top line.
  // Closed-form + parallax-safe: the container's untransformed top is the page top (0),
  // so at scroll 0 the head sits at (BG_SHIFT − lift) + headWithinContainer. The head
  // offset within the container and the hero's document-top are both transform- and
  // scroll-invariant (the shared translate cancels), so solving for `lift` lands the
  // head on the hero line and is idempotent (re-measuring yields the same value).
  const updateSceneLift = useCallback(() => {
    const container = containerRef.current
    const christ = christRef.current
    const hero = document.getElementById('hero')
    if (!container || !christ || !hero) return
    const containerRect = container.getBoundingClientRect()
    const christRect = christ.getBoundingClientRect()
    const heroRect = hero.getBoundingClientRect()
    const vw = window.innerWidth
    const bgShiftPx = Math.min(400, Math.max(0, (1024 - vw) * 400 / 649)) // === BG_SHIFT
    const headWithinContainer = christRect.top - containerRect.top
    const heroTopDoc = heroRect.top + window.scrollY
    const lift = bgShiftPx + headWithinContainer - heroTopDoc
    setSceneLift(prev => (Math.abs(prev - lift) < 0.5 ? prev : lift))
  }, [])

  useEffect(() => {
    if (!peakPos) return // statue is placed once peakPos is known
    updateSceneLift()
    const ro = new ResizeObserver(updateSceneLift)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [peakPos, updateSceneLift])

  // Raise the beach so its TOP lands on the vertical middle of bush 01. The collage
  // (mainSvg) is the only in-flow block, so a negative margin-top pulls the beach UP
  // into the collage. We measure live — bush 01's rendered centre + the collage's
  // rendered height (viewBox 800×2047) — and recompute on resize, like updatePeakPos.
  const updateBeachOffset = useCallback(() => {
    const beach = beachRef.current
    const container = containerRef.current
    if (!beach || !container) return
    const bush = container.querySelector<SVGGraphicsElement>('[id="bush 01"]')
    if (!bush) return
    const cRect = container.getBoundingClientRect()
    const bushRect = bush.getBoundingClientRect()
    const bushMidY = bushRect.top + bushRect.height / 2 // viewport px
    const beachTop = beach.getBoundingClientRect().top  // viewport px, reflects current margin
    const current = parseFloat(beach.style.marginTop) || 0
    // Move the beach so its TOP sits BEACH_LOWER_PX below bush 01's centre; correct
    // relative to the current margin so it converges in one step and self-corrects on
    // resize (negative = up). The extra BEACH_LOWER_PX lowers the beach into its overlap
    // reserve so more real sea/beach art shows below the fold before the terminal fill.
    beach.style.marginTop = `${current + (bushMidY - beachTop) + BEACH_LOWER_PX}px`

    // STRETCH the wave layer BEHIND the beach to span the gap between main2's `curb 3`
    // (upper edge) and `curb` (lower edge) groups — the transparent band the waves show
    // through. Each curb's vertical centre anchors one edge of the band, then the band is
    // EXPANDED by WAVES_TOP_OFFSET_PX (top up) and WAVES_BOTTOM_OFFSET_PX (bottom down).
    // WavesAnimated (fillParent) scales its stack to the height we set here. Querying
    // AFTER the beach margin is set means the rects already reflect the raised position.
    const waves = wavesRef.current
    const curb = beach.querySelector<SVGGraphicsElement>('[id="b2-curb"]')
    const curb3 = beach.querySelector<SVGGraphicsElement>('[id="b2-curb 3"]')
    if (waves && curb && curb3) {
      const rCurb = curb.getBoundingClientRect()
      const rCurb3 = curb3.getBoundingClientRect()
      const curbMid = (rCurb.top + rCurb.bottom) / 2 - cRect.top   // lower edge of the gap
      const curb3Mid = (rCurb3.top + rCurb3.bottom) / 2 - cRect.top // upper edge of the gap
      // Offsets EXPAND the band independently: raise the top edge, lower the bottom.
      const top = curb3Mid - WAVES_TOP_OFFSET_PX
      const bottom = curbMid + WAVES_BOTTOM_OFFSET_PX
      waves.style.top = `${top}px`
      waves.style.height = `${bottom - top}px`
    }

    // Brown ground (stripped from the beach SVG) as its OWN layer at z8 — BELOW the
    // waves (z9) — sized to overlay the beach box exactly, so the beach keeps a solid
    // base everywhere while the sea-gap waves still show through. The beach rect already
    // reflects the margin set above (getBoundingClientRect forces the pending reflow).
    const brown = brownRef.current
    if (brown) {
      const bRect = beach.getBoundingClientRect()
      brown.style.top = `${bRect.top - cRect.top}px`
      brown.style.height = `${bRect.height}px`
    }
  }, [])

  useEffect(() => {
    if (!svgReady || !beachSvg) return
    updateBeachOffset()
    const ro = new ResizeObserver(updateBeachOffset)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [svgReady, beachSvg, updateBeachOffset])

  useTrainAnimation(containerRef, { enabled: svgReady })
  useCarAnimation(containerRef, { enabled: svgReady })
  useCloudAnimation(containerRef, { enabled: svgReady })
  useBushAnimation(bush01Ref, bush02Ref, { enabled: svgReady })
  useBigTreeAnimation(bigTreeRef, { enabled: !!bigTreeSvg })
  useHumanAnimation(containerRef, humanRefs, { enabled: svgReady, debug: false })

  const coverage = useBackgroundCoverage(containerRef, COVERAGE_CONFIG, { ready: svgReady && !!beachSvg, sceneLift })

  // Apply cover-zoom (width) + the static part of the transform (focal + BG_SHIFT),
  // then re-measure the px-based anchors at the new width. The scroll-driven parallax
  // term is composed on top of this in the scroll listener below.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.style.width = `${coverage.zoom * 100}%`
    // translateY composes BG_SHIFT (mobile descent) − sceneLift (start head on hero line).
    container.style.transform =
      `translateX(${coverage.focalTranslateX}px) translateY(calc(${BG_SHIFT} - ${sceneLift}px))`
    // Width changed → the getBoundingClientRect-based anchors must re-measure.
    // getBoundingClientRect inside these forces the pending reflow first.
    updatePeakPos()
    updateBeachOffset()
  }, [coverage.zoom, coverage.focalTranslateX, sceneLift, updatePeakPos, updateBeachOffset])

  // Coverage-parallax: bg lags scroll by (1 − p)·scrollY (positive → slower/lag),
  // composed with the focal + BG_SHIFT transform. One passive listener feeds a rAF
  // lerp loop — the eased current→target write decouples from the (sparse, bursty)
  // scroll/momentum event cadence that made the raw 1:1 write look choppy. Idle
  // detection parks the loop once settled, per the project's animation convention.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const p = coverage.parallaxFactor
    const fx = coverage.focalTranslateX
    // p === 1 → no scroll-driven motion (wide screens, reduced motion). Keep the
    // static transform from the effect above and don't attach a listener.
    if (p >= 1) return

    container.style.willChange = 'transform'
    let raf = 0
    let current = (1 - p) * window.scrollY
    let idle = 0
    const lift = sceneLift
    const write = (par: number) => {
      container.style.transform =
        `translateX(${fx}px) translateY(calc(${BG_SHIFT} - ${lift}px + ${par}px))`
    }
    const tick = () => {
      const target = (1 - p) * window.scrollY
      const diff = target - current
      current += diff * 0.18 // ease toward the scroll-derived target
      if (Math.abs(diff) < 0.5) { current = target; idle++ } else idle = 0
      write(current)
      raf = idle < 5 ? requestAnimationFrame(tick) : 0
    }
    const onScroll = () => { if (!raf) { idle = 0; raf = requestAnimationFrame(tick) } }
    write(current) // set initial position for current scrollY
    raf = requestAnimationFrame(tick)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      container.style.willChange = ''
    }
  }, [coverage.parallaxFactor, coverage.focalTranslateX, sceneLift])

  return (
    <div
      className="absolute top-0 left-0 w-full pointer-events-none"
      style={{
        overflow: 'visible',
        isolation: 'isolate',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(80px)',
        transition: 'opacity 1.4s ease, transform 1.4s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          overflow: 'visible',
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
        <div style={{ position: 'relative', zIndex: 10 }} dangerouslySetInnerHTML={{ __html: mainSvg }} />
      )}
      {/* Brown ground (z8) — the #77533E backdrop stripped from the beach SVG, re-painted
          on its own layer BELOW the waves (z9) and beach (z10). Sized in JS to overlay the
          beach box, so the beach has a solid base everywhere while the waves still show. */}
      {beachSvg && (
        <div
          ref={brownRef}
          aria-hidden="true"
          style={{ position: 'absolute', left: 0, width: '100%', backgroundColor: BEACH_GROUND_COLOR, zIndex: 8 }}
        />
      )}
      {/* Wave bands — pulled OUT of the page flow (was section #6) into the background.
          They sit BEHIND the beach (z9 < main2 z10) in its empty space; main2's opaque
          backdrops are stripped in prepareBeachSvg so they show through. Top + height set
          in JS to the gap [curb3+6, curb+6]; WavesAnimated (fillParent) fits the whole
          band stack INTO that height, so the waves fill it exactly without overflowing. */}
      {beachSvg && (
        <div
          ref={wavesRef}
          aria-hidden="true"
          style={{ position: 'absolute', left: 0, width: '100%', zIndex: 9 }}
        >
          <WavesAnimated fillParent />
        </div>
      )}
      {/* Beach scene (main 2.svg) — in-flow block right below the collage so it extends
          the container height and sits flush under bush 01/02; full width, own viewBox. */}
      {beachSvg && (
        <div
          ref={beachRef}
          style={{ position: 'relative', zIndex: 10, width: '100%' }}
          dangerouslySetInnerHTML={{ __html: beachSvg }}
        />
      )}
      {/* clouds — own layer (z 11: above mainSvg z10, below the train overlay z12 /
          roads z15), reproducing the original "clouds on top of mainSvg" paint order.
          A counter-shift to keep it pinned is added in Task 2. */}
      {cloudsSvg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 11, transform: `translateY(${BG_SHIFT_NEG})` }}
          dangerouslySetInnerHTML={{ __html: cloudsSvg }}
        />
      )}

      {/* roads — pulled out of City so the figures walk ON them (z15, above base terrain
          z10, below every figure). Painted after mainSvg so it sits over the ground. */}
      {roadsSvg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 15 }}
          dangerouslySetInnerHTML={{ __html: roadsSvg }}
        />
      )}

      {/* house 6 — own layer (z25, grouped with house 4): figures RED above / BLUE behind */}
      {house6Svg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 25 }}
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

      {/* house 4 — own layer (z25, grouped with house 6): RED above / BLUE behind;
          YELLOW (z30) passes in front of it but behind house 5 */}
      {house4Svg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 25 }}
          dangerouslySetInnerHTML={{ __html: house4Svg }}
        />
      )}

      {/* house 5 — own layer (z35): only RED figures (z40) pass in front; YELLOW/BLUE behind */}
      {house5Svg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 35 }}
          dangerouslySetInnerHTML={{ __html: house5Svg }}
        />
      )}

      {/* Front layer (z50) — all other houses + mountains, ABOVE every figure */}
      {frontSvg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 50 }}
          dangerouslySetInnerHTML={{ __html: frontSvg }}
        />
      )}

      {/* bush 02 then bush 01 — own layers (above City, below Big tree) for the slide-in */}
      {bush02Svg && (
        <div
          ref={bush02Ref}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 50 }}
          dangerouslySetInnerHTML={{ __html: bush02Svg }}
        />
      )}
      {bush01Svg && (
        <div
          ref={bush01Ref}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 50 }}
          dangerouslySetInnerHTML={{ __html: bush01Svg }}
        />
      )}

      {/* Big tree — own layer (on top of the front-set) so the sway rotates this div */}
      {bigTreeSvg && (
        <div
          ref={bigTreeRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 50 }}
          dangerouslySetInnerHTML={{ __html: bigTreeSvg }}
        />
      )}

      {/* ChristScene: bottom-center anchored to top-center of #Peak, 15px overlap */}
      {peakPos && (
        <div
          ref={christRef}
          className="absolute"
          style={{
            left: peakPos.x,
            top: peakPos.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 55,
          }}
        >
          <ChristScene />
        </div>
      )}
      {/* Terminal fill band — a child of the zoomed container so it INHERITS the same
          width-zoom + focal + parallax transform and stays flush against the artwork's
          bottom edge at every scroll position (top: 100% == the container's bottom).
          A static, outside-the-container band would sit at the art's resting bottom and
          be left mid-page once parallax pushes the art down — leaving a cream gap at the
          true page bottom. Solid colour, so the 2×-width over-extension is harmless and
          the page-root `overflow-x: clip` trims the sides. Spec §3.6. */}
      {coverage.fillHeight > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            height: coverage.fillHeight,
            backgroundColor: fillColor,
            zIndex: 0,
          }}
        />
      )}
      </div>
    </div>
  )
}
