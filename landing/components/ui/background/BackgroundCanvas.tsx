'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ChristScene, { CHRIST_SCENE, christBoxHeight } from './ChristScene'
import { injectRailPath, injectCloudAnimation } from './utils/injectRailPath'
import { useTrainAnimation } from './useTrainAnimation'
import { useCarAnimation } from './useCarAnimation'
import { injectBeachCarAnimation } from './beachCars'
import { injectWaveSurfAnimation, injectStaticSea } from './beachWaves'
import { computeWaveQueue, BEACH_ART_H, type WaveQueueLayout } from './waveQueueLayout'
import { loadOceanWaveShapes, type OceanWaveShape } from './oceanWaves'
import { useWaveDepthOrder } from './useWaveDepthOrder'
import { prepareBeachSvg, BEACH_GROUND_COLOR, BEACH_PREFIX } from './prepareBeachSvg'
import { BEACH_SPINNERS, readViewBox } from './beachSpinners'
import { useBeachSpinnerAnimation } from './useBeachSpinnerAnimation'
import { useCloudAnimation } from './useCloudAnimation'
import { useBushAnimation } from './useBushAnimation'
import { useBigTreeAnimation } from './useBigTreeAnimation'
import { useHumanAnimation } from './useHumanAnimation'
import { HUMANS } from './humanPaths'
import { WavesAnimated } from '@/components/ui/WavesAnimated'
import { useBackgroundCoverage } from './useBackgroundCoverage'
import {
  BOX_BLEED,
  boundedLayerStyle,
  measureGroupBoxes,
  padBox,
  unionBoxes,
  wrapSvgBounded,
  type SpriteBox,
} from './utils/spriteBoxes'

// A sprite lifted out of the base art: tight markup + the box (canvas units) that
// both its viewBox and its wrapper-div position/size are derived from.
type SpriteLayer = { svg: string; box: SpriteBox }

// The collage's own viewBox (matches wrapSvg / background-collage.svg).
const COLLAGE_VB = { x: 0, y: 0, w: 800, h: 2047 } as const

function parseViewBox(str: string | null): { x: number; y: number; w: number; h: number } | null {
  if (!str) return null
  const [x, y, w, h] = str.trim().split(/[\s,]+/).map(Number)
  return Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0 ? { x, y, w, h } : null
}

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

// Drop the clip-path on the object's OUTER <g> so the rotated art isn't cropped to
// its authored box (same reasoning as the cars) and needs none of the beach's defs.
function stripSpinnerClip(groupSvg: string): string {
  return groupSvg.replace(/(<g id="[^"]*")\s+clip-path="[^"]*"/, '$1')
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

// EXPERIMENT: stretch the whole background vertically on phones only, so more art
// covers the tall phone viewport. Origin 'top' keeps the statue/hero anchor in place —
// the added height is added below, not split above+below. Below MOBILE_VSTRETCH_BREAKPOINT
// (phones; tablets/desktop are untouched, matching the phones-only cutoff already used
// for focalAnchorEnd below).
const MOBILE_VSTRETCH = 1.2
const MOBILE_VSTRETCH_BREAKPOINT = 768
const mobileVScale = () =>
  typeof window !== 'undefined' && window.innerWidth < MOBILE_VSTRETCH_BREAKPOINT
    ? MOBILE_VSTRETCH
    : 1

// Background tiers. Sprite layers are BOUNDED (viewBox = sprite box, see spriteBoxes.ts)
// so extraction is affordable everywhere — the page-sized-surface problem that crashed
// the iPhone 12 mini tab (≈1.5 GB of IOSurface backing at DPR 3) is gone by construction.
//  • full     — the default EVERYWHERE: everything, incl. the surf conveyor and the
//               WavesAnimated band. The balanced tier passed the iPhone 12 mini device
//               test with zero lag (2026-07-15), and the user asked for the waves back,
//               so touch was promoted to full — with the levers below as the retreat.
//  • balanced — ?balanced=1: ALL sprite animations, but the sea stays STATIC
//               (injectStaticSea) and the waves band is skipped — the remaining big
//               animated surfaces / per-frame repaint regions. Fall back here first if
//               the surf ever lags or crashes a device.
//  • lite     — ?lite=1 emergency lever: ONE collage svg + clouds, nothing extracted,
//               static sea (the mode that was the touch default while bisecting the crash).
// Decided once per load, like the rest of the DOM structure.
type BackgroundTier = 'full' | 'balanced' | 'lite'
const backgroundTier = (): BackgroundTier => {
  if (typeof window === 'undefined') return 'full'
  const params = new URLSearchParams(location.search)
  if (params.has('lite')) return 'lite'
  if (params.has('balanced')) return 'balanced'
  return 'full'
}

// Debug kill-switch (?nobg=1): skip the artwork fetches entirely — the canvas stays
// an empty cream placeholder. Lets a crash be bisected on a real device: if the tab
// still dies with the whole background gone, the background is exonerated.
const isBgDisabled = () =>
  typeof window !== 'undefined' && new URLSearchParams(location.search).has('nobg')

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
// maxZoomWide 1.0: wide screens must NOT spend the crop budget. The sea band is capped
// now (see waveQueueLayout), which lowers naturalHeight — and an uncapped zoom would
// simply take that freed space straight back and re-magnify every wave. Measured at 1024:
// the art has zero surplus, so a shortened sea puts zoomFull at 1.16. Holding zoom at 1
// costs nothing visually: a production probe measured zoom = 1 and focalTranslateX = 0 at
// every width already, so the framing below has never actually engaged.
// focalX is overridden at runtime by the measured Christ-statue column (see the hook),
// so the crop keeps the statue centred; this value is only the pre-measure fallback.
const COVERAGE_CONFIG = {
  maxZoom: 2.0, maxZoomWide: 1.0, focalX: 0.45, minP: 0.3,
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
// Desktop counterpart: at ≥1024px (same mobile/tablet-vs-desktop line as BG_SHIFT) the
// wide viewport was pushing main2 down far enough that the ocean waves at the very
// bottom of the page mostly fell into the flat terminal-fill band instead of showing
// real wave art. Retract main2 by 100px on wide screens to pull the waves back into view.
const BEACH_LOWER_PX_WIDE = BEACH_LOWER_PX - 100
const BEACH_LOWER_WIDE_BREAKPOINT = 1024
// Same retraction, taken further at ≥1920 — the problem this fixes GROWS with width.
// The beach's px-per-canvas-unit scales with the container width, so the SAME pixel gap
// between the beach's top and the page bottom buys FEWER canvas units the wider the
// screen: the 5650px of beach visible at 1920 is only 3022 canvas units, where 1440's
// 5445px is 3883. The sea starts at canvas 3180, so past ~1700px the waterline slides
// below the fold and the surf shrinks to a sliver at the shore — measured 199px of wave
// band at 1920 vs 1126px at 1440. Raising main2 another 300px buys back 3022 → 3183
// canvas units, which puts the waterline back on screen and doubles the visible band.
// (2560 is NOT solved by this: its page bottom lands at canvas 1867, over a thousand
// units above where the waves even begin, so no raise of this magnitude reaches them.
// That is pre-existing — the old geometry started its waves at 2720, also below 1867.)
const BEACH_LOWER_PX_XWIDE = BEACH_LOWER_PX_WIDE - 300
const BEACH_LOWER_XWIDE_BREAKPOINT = 1920

// Seat the statue on the crest. What we can position is the scene BOX (its bottom edge),
// but what must land on the rock is the PEDESTAL — and the two are not the same line: the
// art leaves a transparent gap under the pedestal (it ends at PEDESTAL_TOP+PEDESTAL_H of
// H, see ChristScene). That gap scales with the box, and the box is sized off the VIEWPORT
// (clamp(234px, 27vw, 522px)) — a completely different curve from the mountain, which
// scales with the collage zoom. So any offset expressed against the PEAK drifts: a fixed
// +15px sank the pedestal 0.12 of the peak on desktop but 0.21 on a phone (floating vs
// buried), and even a peak-proportional offset still slid from 0.067 to 0.115 across
// 360→767px because the gap underneath it kept changing size.
//
// Anchoring the PEDESTAL instead removes the mountain from the equation entirely: push the
// box bottom below the crest by the gap (so the pedestal's own base lands ON the crest),
// plus a bite of the pedestal's own height so it reads as planted in the rock rather than
// balanced on it. Both terms are fractions of the box, so the bite is a constant share of
// the pedestal at EVERY width — the statue sits on the edge everywhere, by construction.
const PEDESTAL_BITE = 0.10 // pedestal sinks 10% of its own height into the crest
const STATUE_SEAT_FRACTION =
  (CHRIST_SCENE.H - (CHRIST_SCENE.PEDESTAL_TOP + CHRIST_SCENE.PEDESTAL_H)
    + PEDESTAL_BITE * CHRIST_SCENE.PEDESTAL_H) / CHRIST_SCENE.H

export default function BackgroundCanvas() {
  const [mainSvg, setMainSvg] = useState('')
  const [beachSvg, setBeachSvg] = useState('')
  const [beachRaw, setBeachRaw] = useState('')      // full tier only: prepared beach, cars injected, NO queue
  const [resizeTick, setResizeTick] = useState(0)   // debounced resize → re-evaluate the layout
  const [waveShapes, setWaveShapes] = useState<Record<string, OceanWaveShape> | null>(null)
  // Beach's ORIGINAL viewBox (pre surf-injection, which rewrites the base svg's one) —
  // the spinner host div reproduces this canvas so the bounded overlays line up.
  const [beachVB, setBeachVB] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [spinnerLayers, setSpinnerLayers] = useState<(SpriteLayer | null)[]>([])
  const [cityLayer, setCityLayer] = useState<SpriteLayer | null>(null)
  const [cloudsSvg, setCloudsSvg] = useState('')
  const [frontSvg, setFrontSvg] = useState('')
  const [bigTreeLayer, setBigTreeLayer] = useState<SpriteLayer | null>(null)
  const [bush01Layer, setBush01Layer] = useState<SpriteLayer | null>(null)
  const [bush02Layer, setBush02Layer] = useState<SpriteLayer | null>(null)
  const [roadsLayer, setRoadsLayer] = useState<SpriteLayer | null>(null)
  const [house4Layer, setHouse4Layer] = useState<SpriteLayer | null>(null)
  const [house5Layer, setHouse5Layer] = useState<SpriteLayer | null>(null)
  const [house6Layer, setHouse6Layer] = useState<SpriteLayer | null>(null)
  const [humanLayers, setHumanLayers] = useState<(SpriteLayer | null)[]>([null, null, null, null])
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
  const bakedLayout = useRef<WaveQueueLayout | null>(null)
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
    if (isBgDisabled()) return
    fetch('/SVG/background/background-collage.svg')
      .then(r => r.text())
      .then(raw => {
        let s = raw

        // Lite (?lite=1): NO sprite layers — everything except the clouds stays inside
        // the one main SVG (static city, houses, humans, bushes, big tree in their
        // authored paint order). See backgroundTier.
        if (backgroundTier() !== 'lite') {
          // Measure every sprite's rendered box (canvas units) BEFORE extraction, so
          // each overlay carries a TIGHT viewBox instead of the whole 800×2047 canvas
          // (page-sized surfaces were the mobile crash — see backgroundTier).
          const boxes = measureGroupBoxes(raw, [
            'Background city', 'house 6', 'house 4', 'house 5',
            'road 1', 'road 2', 'road 3',
            ...HUMANS.map(h => h.id),
            'bush 02', 'bush 01', 'Big tree',
          ])
          // Extract a group into a bounded layer. If its box could not be measured
          // (id drift after an art re-export), the group is LEFT inside mainSvg — the
          // sprite degrades to static instead of disappearing.
          const takeLayer = (
            src: string,
            id: string,
            pad = BOX_BLEED,
          ): { layer: SpriteLayer | null; rest: string } => {
            const measured = boxes.get(id)
            if (!measured) return { layer: null, rest: src }
            const { inner, without } = extractGroup(src, id)
            if (!inner) return { layer: null, rest: src }
            const box = padBox(measured, pad)
            return { layer: { svg: wrapSvgBounded(inner, box), box }, rest: without }
          }

          const city = takeLayer(s, 'Background city')
          setCityLayer(city.layer)
          // Pull the figures + their two occlusion houses OUT of `City` FIRST (all of
          // house 1..11 and human 1..4 are nested inside the `City` group). They must
          // leave City before it is lifted to the front layer below.
          s = city.rest

          // house 6, house 4, house 5 — own layers; figures interleave by their
          // per-figure z (see the JSX z map).
          const h6 = takeLayer(s, 'house 6')
          setHouse6Layer(h6.layer)
          s = h6.rest
          const h4 = takeLayer(s, 'house 4')
          setHouse4Layer(h4.layer)
          s = h4.rest
          const h5 = takeLayer(s, 'house 5')
          setHouse5Layer(h5.layer)
          s = h5.rest

          // Roads are nested in City too, but the figures must walk ON TOP of them.
          // Pull them out into ONE layer (union box) below the figures.
          let roadsInner = ''
          const roadBoxes: (SpriteBox | undefined)[] = []
          for (const id of ['road 1', 'road 2', 'road 3']) {
            if (!boxes.get(id)) continue // unmeasured → stays baked in mainSvg
            const { inner, without } = extractGroup(s, id)
            if (!inner) continue
            roadsInner += inner
            roadBoxes.push(boxes.get(id))
            s = without
          }
          const roadsUnion = unionBoxes(roadBoxes)
          if (roadsInner && roadsUnion) {
            const box = padBox(roadsUnion, BOX_BLEED)
            setRoadsLayer({ svg: wrapSvgBounded(roadsInner, box), box })
          }

          // human 1–4 — each its own animated wrapper-div layer. Wider bleed: the gait
          // adds a slight scale and a per-figure seat offset around the tight bbox.
          const humans: (SpriteLayer | null)[] = []
          for (const cfg of HUMANS) {
            const t = takeLayer(s, cfg.id, 20)
            humans.push(t.layer)
            s = t.rest
          }
          setHumanLayers(humans)

          // Lift the front-set groups out of the main SVG into their own layer (z:7, above the train).
          // Deliberately NOT bounded: the set spans mountains across most of the canvas —
          // its union box ≈ the canvas anyway, so it stays one big (static) layer.
          let frontInner = ''
          for (const id of FRONT_IDS) {
            const { inner, without } = extractGroup(s, id)
            frontInner += inner
            s = without
          }
          if (frontInner) setFrontSvg(wrapSvg(frontInner))

          // bush 01 / bush 02 — own layers so the slide-in can transform the wrapper div.
          // Their boxes are EXTENDED to the canvas edge on the pivot side: the sway hook
          // pivots at originX '0%'/'100%' of the layer, which must stay the container
          // edge (long-lever sway), not the bush's own edge. bush 1 → left, bush 2 → right.
          const toEdge = (b: SpriteBox, side: 'left' | 'right'): SpriteBox => {
            const pb = padBox(b, BOX_BLEED)
            return side === 'left'
              ? { x: COLLAGE_VB.x, y: pb.y, w: pb.x + pb.w - COLLAGE_VB.x, h: pb.h }
              : { x: pb.x, y: pb.y, w: COLLAGE_VB.x + COLLAGE_VB.w - pb.x, h: pb.h }
          }
          const b02 = boxes.get('bush 02')
          if (b02) {
            const { inner, without } = extractGroup(s, 'bush 02')
            if (inner) {
              const box = toEdge(b02, 'right')
              setBush02Layer({ svg: wrapSvgBounded(inner, box), box })
              s = without
            }
          }
          const b01 = boxes.get('bush 01')
          if (b01) {
            const { inner, without } = extractGroup(s, 'bush 01')
            if (inner) {
              const box = toEdge(b01, 'left')
              setBush01Layer({ svg: wrapSvgBounded(inner, box), box })
              s = without
            }
          }

          // Big tree gets its own layer so the sway can rotate the wrapper div
          // (rotating a <g> inside dangerouslySetInnerHTML doesn't take visually).
          const tree = takeLayer(s, 'Big tree', 40)
          setBigTreeLayer(tree.layer)
          s = tree.rest
        }

        // Clouds — own layer so the mobile descent leaves the sky pinned while
        // everything else shifts down. Extract in document order (overlap preserved).
        // Lifted in ALL tiers: the lite mobile descent needs the pinned sky most.
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
    if (isBgDisabled()) return
    const tier = backgroundTier()
    // Lite (?lite=1): static beach — baked wave silhouettes + static water plane (no
    // SMIL surf conveyor, no car SMIL, no lifted palm/umbrella overlays), skip the
    // Ocean Waves fetches.
    if (tier === 'lite') {
      fetch('/SVG/background/main%202.svg')
        .then(r => r.text())
        .then(raw => setBeachSvg(injectStaticSea(prepareBeachSvg(raw), BEACH_ART_H)))
        .catch(err => console.warn('BackgroundCanvas: beach SVG fetch failed', err))
      return
    }
    // full: surf conveyor (needs the Ocean Waves shapes). balanced: static sea — the
    // conveyor is a large per-frame SMIL repaint region, kept off phones; skip the fetch.
    const wantSurf = tier === 'full'
    const load: Promise<[string, Record<string, OceanWaveShape> | null]> = wantSurf
      ? Promise.all([fetch('/SVG/background/main%202.svg').then(r => r.text()), loadOceanWaveShapes()])
      : fetch('/SVG/background/main%202.svg').then(r => r.text()).then(raw => [raw, null])
    load
      .then(([raw, shapes]) => {
        // Prepare (namespace ids, strip backdrops), then LIFT each palm/umbrella out
        // into its own BOUNDED overlay (clip-path stripped; viewBox = the object's own
        // measured box — a full-canvas overlay is a page-sized composited surface, the
        // mobile crash). The base beach = the remainder, with the car SMIL injected as
        // before. Index alignment with BEACH_SPINNERS is kept via null placeholders.
        let s = prepareBeachSvg(raw)
        // Boxes are measured against the beach's OWN viewBox, read from the markup — a
        // hardcoded copy goes stale the moment the art is re-exported, and every object
        // then lands in the wrong place. Lift before the surf injection, which rewrites
        // that viewBox; the spinner host div reproduces this ORIGINAL canvas.
        const vb = parseViewBox(readViewBox(s))
        const spinnerIds = BEACH_SPINNERS.map(cfg => `${BEACH_PREFIX}${cfg.id}`)
        const boxes = vb ? measureGroupBoxes(s, spinnerIds) : new Map<string, SpriteBox>()
        const spinners: (SpriteLayer | null)[] = []
        for (const cfg of BEACH_SPINNERS) {
          const id = `${BEACH_PREFIX}${cfg.id}`
          const measured = boxes.get(id)
          if (!measured) {
            spinners.push(null) // unmeasured → stays baked in the beach, static
            continue
          }
          const { inner, without } = extractGroup(s, id)
          if (!inner) {
            spinners.push(null)
            continue
          }
          const box = padBox(measured, BOX_BLEED)
          spinners.push({ svg: wrapSvgBounded(stripSpinnerClip(inner), box), box })
          s = without
        }
        setBeachVB(vb)
        setSpinnerLayers(spinners)
        s = injectBeachCarAnimation(s)
        if (wantSurf && shapes) {
          setWaveShapes(shapes) // also feeds the terminal sea-fill band
          setBeachRaw(s)        // baked once the container can be measured (effect below)
        } else {
          setBeachSvg(injectStaticSea(s, BEACH_ART_H)) // balanced: no layout to wait for
        }
      })
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
    // getBoundingClientRect reflects the container's scaleY(mobileVScale()) transform
    // (see coverage effect below), but `top` on christRef is a PRE-transform local
    // offset that the SAME transform then re-scales — divide it out here or the
    // stretch gets applied twice and the statue drifts off the peak on mobile.
    const vScale = mobileVScale()
    setPeakPos({
      // horizontal: 2/5 from left edge (ratio 2:3) — unaffected, scaleY doesn't touch X
      x: peakRect.left - containerRect.left + peakRect.width * (2 / 5),
      // vertical: drop the scene BOX bottom below the crest by STATUE_SEAT_FRACTION of the
      // box height, which lands the PEDESTAL (not the box) on the rock with a constant bite
      // at every width — see STATUE_SEAT_FRACTION. Scaled off the box, never the peak.
      // Divided by vScale because peakPos.y is a PRE-transform local top that the
      // container's scaleY(vScale) then re-scales.
      y: (peakRect.top - containerRect.top
        + STATUE_SEAT_FRACTION * christBoxHeight(window.innerWidth)) / vScale,
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
    // All getBoundingClientRect reads below reflect the container's scaleY(mobileVScale())
    // transform (see coverage effect below), but marginTop/top/height set on descendants
    // of that same container are PRE-transform local values that the transform re-scales
    // — every post-transform delta must be divided by vScale before being written back,
    // or the stretch applies twice (beach, waves, brown ground all drift on mobile).
    const vScale = mobileVScale()
    const cRect = container.getBoundingClientRect()
    const bushRect = bush.getBoundingClientRect()
    const bushMidY = bushRect.top + bushRect.height / 2 // viewport px
    const beachTop = beach.getBoundingClientRect().top  // viewport px, reflects current margin
    const current = parseFloat(beach.style.marginTop) || 0
    // Move the beach so its TOP sits beachLowerPx below bush 01's centre; correct
    // relative to the current margin so it converges in one step and self-corrects on
    // resize (negative = up). The extra offset lowers the beach into its overlap
    // reserve so more real sea/beach art shows below the fold before the terminal fill.
    // Three tiers, each retracting further than the last: the wider the viewport, the
    // fewer canvas units the same on-screen gap buys, so the sea sinks below the fold
    // (see the constants). ≥1920 raises most, ≥1024 some, mobile/tablet not at all.
    const vw = window.innerWidth
    const beachLowerPx =
      vw >= BEACH_LOWER_XWIDE_BREAKPOINT ? BEACH_LOWER_PX_XWIDE
      : vw >= BEACH_LOWER_WIDE_BREAKPOINT ? BEACH_LOWER_PX_WIDE
      : BEACH_LOWER_PX
    beach.style.marginTop = `${current + (bushMidY - beachTop) / vScale + beachLowerPx}px`

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
      const curbMid = ((rCurb.top + rCurb.bottom) / 2 - cRect.top) / vScale   // lower edge of the gap
      const curb3Mid = ((rCurb3.top + rCurb3.bottom) / 2 - cRect.top) / vScale // upper edge of the gap
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
      brown.style.top = `${(bRect.top - cRect.top) / vScale}px`
      brown.style.height = `${bRect.height / vScale}px`
    }
  }, [])

  useEffect(() => {
    if (!svgReady || !beachSvg) return
    updateBeachOffset()
    const ro = new ResizeObserver(updateBeachOffset)
    ro.observe(document.documentElement)
    return () => ro.disconnect()
  }, [svgReady, beachSvg, updateBeachOffset])

  // In lite mode the sprite layers don't exist — their hooks stay disabled (the
  // cloud reveal is kept: it's a one-shot CSS transition on the still-lifted clouds).
  const tier = backgroundTier()
  const sprites = tier !== 'lite'
  // Host renders only once some layer exists (all states start null), which also keeps
  // SSR/hydration consistent — the server can't know the tier.
  const hasCollageSprites =
    !!(cityLayer || roadsLayer || house4Layer || house5Layer || house6Layer ||
      bush01Layer || bush02Layer || bigTreeLayer) || humanLayers.some(Boolean)
  useTrainAnimation(containerRef, { enabled: svgReady && sprites })
  useCarAnimation(containerRef, { enabled: svgReady && sprites })
  useCloudAnimation(containerRef, { enabled: svgReady })
  useBushAnimation(bush01Ref, bush02Ref, { enabled: svgReady && sprites })
  useBigTreeAnimation(bigTreeRef, { enabled: !!bigTreeLayer })
  useHumanAnimation(containerRef, humanRefs, { enabled: svgReady && sprites, debug: false })
  useBeachSpinnerAnimation(beachRef, { enabled: !!beachSvg && sprites })
  // Animated sea for the terminal band below the beach (built once shapes load).

  const coverage = useBackgroundCoverage(containerRef, beachRef, COVERAGE_CONFIG, { ready: svgReady && !!beachSvg, sceneLift })

  // Baking the SMIL into the beach string is not free, so the layout is only
  // re-evaluated on a settled resize — never per pixel.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null
    const onResize = () => {
      if (t) clearTimeout(t)
      t = setTimeout(() => setResizeTick(v => v + 1), 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (t) clearTimeout(t)
    }
  }, [])

  // Bake the wave conveyor into the beach string. Runs on the first load and then only
  // when the layout has MATERIALLY changed — an integer wave count is a coarse signal by
  // construction, and the 10% band on the wave height stops the (container width → zoom →
  // naturalHeight → beachViewH → container width) feedback loop from thrashing. Converges
  // in one or two passes: the first bake happens before the beach has any height, so
  // baseHeightPx is still the collage's bottom; the injection changes the container height,
  // the coverage hook re-measures, and this effect settles.
  useEffect(() => {
    if (!beachRaw || !waveShapes) return
    const aspects = Object.values(waveShapes).map(s => s.h / s.w)
    if (aspects.length === 0) return

    const main = document.querySelector('main')
    if (!main) return

    const layout = computeWaveQueue({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      containerWidth: coverage.containerWidth || window.innerWidth,
      vScaleY: mobileVScale(),
      contentHeight: main.offsetTop + main.offsetHeight,
      baseHeightPx: coverage.baseHeightPx,
      verticalOffset: coverage.verticalOffset,
      aspects,
    })

    const prev = bakedLayout.current
    const settled =
      prev !== null &&
      prev.n === layout.n &&
      Math.abs(layout.thUnits / prev.thUnits - 1) <= 0.10
    if (settled) return

    bakedLayout.current = layout
    setBeachSvg(injectWaveSurfAnimation(beachRaw, { layout, shapes: waveShapes }))
  }, [
    beachRaw, waveShapes, resizeTick,
    coverage.containerWidth, coverage.baseHeightPx, coverage.verticalOffset,
  ])

  // Order every queue in the tree — the beach AND the terminal sea-fill band. Re-run when a
  // queue mounts/unmounts (booleans keep the dep stable across unrelated renders).
  useWaveDepthOrder(containerRef, beachSvg)

  // Apply cover-zoom (width) + the static part of the transform (focal + BG_SHIFT),
  // then re-measure the px-based anchors at the new width. The scroll-driven parallax
  // term is composed on top of this in the scroll listener below.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.style.width = `${coverage.zoom * 100}%`
    container.style.transformOrigin = 'top'
    // translateY composes BG_SHIFT (mobile descent) − sceneLift (start head on hero line).
    // scaleY: phones-only vertical stretch experiment (MOBILE_VSTRETCH), 1 elsewhere.
    container.style.transform =
      `translateX(${coverage.focalTranslateX}px) translateY(calc(${BG_SHIFT} - ${sceneLift}px)) scaleY(${mobileVScale()})`
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
    const vScale = mobileVScale()
    const write = (par: number) => {
      container.style.transform =
        `translateX(${fx}px) translateY(calc(${BG_SHIFT} - ${lift}px + ${par}px)) scaleY(${vScale})`
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
      className="background-canvas absolute top-0 left-0 w-full pointer-events-none"
      style={{
        overflow: 'visible',
        isolation: 'isolate',
        opacity: entered ? 1 : 0,
        transform: entered ? 'translateY(0)' : 'translateY(80px)',
        transition: 'opacity 1.4s ease, transform 1.4s cubic-bezier(0.16,1,0.3,1), filter 0.3s ease',
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
          band stack INTO that height, so the waves fill it exactly without overflowing.
          Skipped below the full tier: the baked static sea still covers that band there,
          and each wave band is another 3 animated full-width layers. */}
      {beachSvg && tier === 'full' && (
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
        <div ref={beachRef} data-bg-layer="beach" style={{ position: 'relative', zIndex: 10, width: '100%' }}>
          {/* base beach (minus the lifted palms/umbrellas) — establishes the block height;
              curb/curb3/brown/fill queries still resolve against this child */}
          <div dangerouslySetInnerHTML={{ __html: beachSvg }} />
          {/* one BOUNDED overlay per lifted object, inside a host that reproduces the
              beach's ORIGINAL canvas (the surf injection rewrites the base svg's
              viewBox, so the host pins the pre-rewrite aspect); %-positions equal the
              measured boxes. The hook rotates each wrapper around the object's own
              centre by data-spin-id. The host must NOT create a stacking context. */}
          {beachVB && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                aspectRatio: `${beachVB.w} / ${beachVB.h}`,
                overflow: 'visible',
              }}
            >
              {spinnerLayers.map((layer, i) =>
                layer ? (
                  <div
                    key={BEACH_SPINNERS[i].id}
                    data-spin-id={BEACH_SPINNERS[i].id}
                    style={boundedLayerStyle(layer.box, beachVB)}
                    dangerouslySetInnerHTML={{ __html: layer.svg }}
                  />
                ) : null,
              )}
            </div>
          )}
        </div>
      )}
      {/* clouds — own layer (z 11: above mainSvg z10, below the train overlay z12 /
          roads z15), reproducing the original "clouds on top of mainSvg" paint order.
          Decoupled from the cover-zoom framing so the sky looks the SAME at every width
          (like desktop): the collage zooms/shifts to keep the statue framed, but that
          ballooned the clouds and flung them off-screen on narrow viewports. We undo it —
          • width 100/zoom% cancels the container's `width: zoom%` scale → clouds render
            at natural (zoom-1) size, aspect-locked to the viewport width;
          • translateX(-focalTranslateX) cancels the horizontal focal shift → left edge
            flush with the viewport, so cloud columns sit where they do on desktop;
          • +sceneLift cancels the statue-head lift, which balloons on narrow widths
            (62->400px) and otherwise shoves the whole sky above the viewport top;
          • BG_SHIFT_NEG still cancels the mobile vertical descent.
          Net vertical offset is then 0 (+ the scroll parallax, which is ~0 at the hero
          where the clouds live). transformOrigin top-left so the width change scales from
          the corner, not centre. */}
      {cloudsSvg && (
        <div
          style={{
            position: 'absolute', top: 0, left: 0,
            width: `${100 / coverage.zoom}%`,
            zIndex: 11,
            transformOrigin: 'top left',
            transform: `translateX(${-coverage.focalTranslateX}px) translateY(calc(${BG_SHIFT_NEG} + ${sceneLift}px))`,
          }}
          dangerouslySetInnerHTML={{ __html: cloudsSvg }}
        />
      )}

      {/* Front layer (z50) — all other houses + mountains, ABOVE every figure */}
      {frontSvg && (
        <div
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 50 }}
          dangerouslySetInnerHTML={{ __html: frontSvg }}
        />
      )}

      {/* Bounded sprite host — spans exactly the collage canvas (width 100% +
          aspect-ratio 800/2047), so the children's %-positions equal canvas
          coordinates and survive resize/cover-zoom without JS. The host must NOT
          get a z-index or transform (no stacking context): each child's z-index
          keeps interleaving with the siblings outside — mainSvg z10 above the
          z-auto city, clouds z11, the front layer z50 painted before the equal-z50
          bushes/tree because this host comes AFTER it in the DOM. The z map is the
          same as the old full-canvas layers carried. */}
      {hasCollageSprites && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            aspectRatio: '800 / 2047',
            overflow: 'visible',
          }}
        >
          {/* Background city — z-auto keeps it under mainSvg (z10), as before */}
          {cityLayer && (
            <div
              style={boundedLayerStyle(cityLayer.box, COLLAGE_VB)}
              dangerouslySetInnerHTML={{ __html: cityLayer.svg }}
            />
          )}
          {/* roads — pulled out of City so the figures walk ON them (z15, above base
              terrain z10, below every figure) */}
          {roadsLayer && (
            <div
              style={{ ...boundedLayerStyle(roadsLayer.box, COLLAGE_VB), zIndex: 15 }}
              dangerouslySetInnerHTML={{ __html: roadsLayer.svg }}
            />
          )}
          {/* house 6 — z25, grouped with house 4: figures RED above / BLUE behind */}
          {house6Layer && (
            <div
              style={{ ...boundedLayerStyle(house6Layer.box, COLLAGE_VB), zIndex: 25 }}
              dangerouslySetInnerHTML={{ __html: house6Layer.svg }}
            />
          )}
          {/* human 1–4 — own animated layers (baseZ from HUMANS; hook drives transform + z) */}
          {humanLayers.map((layer, i) =>
            layer ? (
              <div
                key={HUMANS[i].id}
                ref={humanRefs[i]}
                style={{ ...boundedLayerStyle(layer.box, COLLAGE_VB), zIndex: HUMANS[i].baseZ }}
                dangerouslySetInnerHTML={{ __html: layer.svg }}
              />
            ) : null
          )}
          {/* house 4 — z25, grouped with house 6: RED above / BLUE behind;
              YELLOW (z30) passes in front of it but behind house 5 */}
          {house4Layer && (
            <div
              style={{ ...boundedLayerStyle(house4Layer.box, COLLAGE_VB), zIndex: 25 }}
              dangerouslySetInnerHTML={{ __html: house4Layer.svg }}
            />
          )}
          {/* house 5 — z35: only RED figures (z40) pass in front; YELLOW/BLUE behind */}
          {house5Layer && (
            <div
              style={{ ...boundedLayerStyle(house5Layer.box, COLLAGE_VB), zIndex: 35 }}
              dangerouslySetInnerHTML={{ __html: house5Layer.svg }}
            />
          )}
          {/* bush 02 then bush 01 — z50, above the front-set (host is after it in the
              DOM), below Big tree; boxes reach the pivot-side canvas edge (see toEdge)
              so the sway hook's originX '0%'/'100%' stays the container edge */}
          {bush02Layer && (
            <div
              ref={bush02Ref}
              style={{ ...boundedLayerStyle(bush02Layer.box, COLLAGE_VB), zIndex: 50 }}
              dangerouslySetInnerHTML={{ __html: bush02Layer.svg }}
            />
          )}
          {bush01Layer && (
            <div
              ref={bush01Ref}
              style={{ ...boundedLayerStyle(bush01Layer.box, COLLAGE_VB), zIndex: 50 }}
              dangerouslySetInnerHTML={{ __html: bush01Layer.svg }}
            />
          )}
          {/* Big tree — on top of the front-set; the sway rotates this div */}
          {bigTreeLayer && (
            <div
              ref={bigTreeRef}
              style={{ ...boundedLayerStyle(bigTreeLayer.box, COLLAGE_VB), zIndex: 50 }}
              dangerouslySetInnerHTML={{ __html: bigTreeLayer.svg }}
            />
          )}
        </div>
      )}

      {/* ChristScene: bottom-center anchored to #Peak's crest, offset so the PEDESTAL
          (not the scene box, which has transparent space under it) plants on the rock —
          see STATUE_SEAT_FRACTION.
          The container's phones-only scaleY(MOBILE_VSTRETCH) stretches the scenery to
          cover the tall phone viewport, but it would ALSO stretch this statue overlay
          (a recognisable object, not scenery) into a distorted elongated figure. Counter
          it here: scaleY(1/vScale) cancels the container's vertical scale so the statue
          renders at natural proportions, while transformOrigin '50% 100%' pivots the undo
          about the pedestal base — the exact point planted on the peak — so seating on
          the crest is preserved. On desktop vScale===1 and this is a no-op. */}
      {peakPos && (
        <div
          ref={christRef}
          className="absolute"
          style={{
            left: peakPos.x,
            top: peakPos.y,
            transformOrigin: '50% 100%',
            transform: `translate(-50%, -100%) scaleY(${1 / mobileVScale()})`,
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
            backgroundColor: fillColor, // deep-water base behind the waves (never a bare stub)
            overflow: 'hidden',
            zIndex: 0,
          }}
        >
        </div>
      )}
      </div>
    </div>
  )
}
