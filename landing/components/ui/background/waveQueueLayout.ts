// Pure geometry for the ocean-wave conveyor. No DOM — fully unit-testable
// (see scripts/verifyWaveQueue.ts). Mirrors spec 2026-07-13 §3.1–§3.3.
//
// The problem this solves: the wave's size used to be a constant in canvas units,
// and the beach SVG scales with the container WIDTH — so a wave was ~1× the screen
// height at 1920px and ~0.25× at 375px, and the sea band (BEACH_VIEW_H) was a fixed
// space-filler that handed desktop ~1770px of surplus water. Here the wave height is
// derived from the viewport HEIGHT instead, the sea band's length is derived from the
// wave count, and the count is capped. Whatever space that leaves uncovered is closed
// by the deficit-driven parallax in backgroundCoverage.ts — not by the sea, not by zoom.

export const VIEWBOX_W = 1027       // beach canvas width (user units)
export const BEACH_ART_H = 3614     // authored height of main 2.svg — a HARD floor for the
                                    // viewBox: anything smaller crops the real beach art.
export const QUEUE_SHORE_CY = 3000  // where a wave dissolves onto the sand — does not move
export const SEA_BASE_TOP = 3180    // top edge of the painted water

// ── Tuning block (spec §5). Confirmed against the Task 1 probe on a prod build. ──
// Wave height as a fraction of the VIEWPORT HEIGHT. Two values, not one: the bug is
// desktop-only. The probe measured today's rendered wave at 0.997 of the viewport at
// 1920 (the "wall") but only 0.23 at 375 — phones were never broken, so they keep
// their current size and only wide screens are pulled down to a sane fraction.
// 0.23 is not a taste call: it is what 375 renders TODAY (mean thUnits 480 ->
// 480 · 375/1027 · 1.2 = 210px of a 900px viewport), so phones come out unchanged.
// The formula below is built so rendered px height == WAVE_H_VH · viewportHeight
// exactly (containerWidth and vScaleY cancel), which is what makes that arithmetic
// directly comparable.
export const WAVE_H_VH_WIDE = 0.30    // >= WIDE_BREAKPOINT: fixes the desktop wall
export const WAVE_H_VH_NARROW = 0.23  // < WIDE_BREAKPOINT: matches today's phones
export const STEP_RATIO = 0.50      // gap between waves as a fraction of their height
export const N_CAP_WIDE = 6         // wave cap at >= WIDE_BREAKPOINT
export const N_CAP_NARROW = 12      // wave cap below it
export const N_MIN = 3
export const WIDE_BREAKPOINT = 1024
export const QUEUE_SPEED = 23       // canvas units per second (= the tuned 1150 / 50s)
export const SEA_MARGIN = 60        // headroom below the spawn line, canvas units
// Mean wave height the FOAM constants were tuned against (the old
// WAVE_HEIGHT_REF_W · mean aspect = 1027 · 1.5 · 0.3114). Every absolute foam depth in
// beachWaves.ts is a multiple of this, so they scale by waveScale = thUnits / TH_TUNED_REF.
export const TH_TUNED_REF = 480

export interface WaveQueueInput {
  viewportWidth: number
  viewportHeight: number
  /** container's rendered width in px — already includes the cover-zoom */
  containerWidth: number
  /** mobileVScale(): the phones-only vertical stretch (1.2 / 1) */
  vScaleY: number
  /** H_content — <main> offsetTop + offsetHeight */
  contentHeight: number
  /** the beach's offset within the container (px) — i.e. everything ABOVE the beach */
  baseHeightPx: number
  /** net UPWARD translate on the container = sceneLift − BG_SHIFT */
  verticalOffset: number
  /** h/w of each ocean-wave silhouette */
  aspects: number[]
}

export interface WaveQueueLayout {
  n: number
  /** replaces WAVE_HEIGHT_REF_W: a wave's height = heightRefW · (h/w) */
  heightRefW: number
  /** the MEAN wave's height, canvas units */
  thUnits: number
  /** the TALLEST wave's height, canvas units */
  thMax: number
  stepUnits: number
  travel: number
  shoreCy: number
  spawnCy: number
  beachViewH: number
  durSeconds: number
  /** thUnits / TH_TUNED_REF — the factor every absolute foam depth is scaled by */
  waveScale: number
}

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function computeWaveQueue(input: WaveQueueInput): WaveQueueLayout {
  const {
    viewportWidth, viewportHeight, containerWidth, vScaleY,
    contentHeight, baseHeightPx, verticalOffset, aspects,
  } = input

  const meanAspect = aspects.reduce((a, b) => a + b, 0) / aspects.length
  const maxAspect = Math.max(...aspects)

  // px per canvas unit, VERTICALLY: the beach <svg> scales uniformly with the container
  // width, and the container's scaleY then stretches it again on phones.
  const pxPerUnitY = (containerWidth / VIEWBOX_W) * vScaleY

  // Pre-render / degenerate measurement: fall back to the shortest legal queue rather
  // than dividing by zero and poisoning the whole SVG with NaN.
  if (!(pxPerUnitY > 0) || !(meanAspect > 0)) {
    return degenerate(meanAspect, maxAspect)
  }

  // Wide screens are the ones with the wall; phones keep the size they already have.
  // Same breakpoint as the wave cap below — one line separates "desktop" from "not".
  const waveHVh = viewportWidth >= WIDE_BREAKPOINT ? WAVE_H_VH_WIDE : WAVE_H_VH_NARROW
  const thUnits = (waveHVh * viewportHeight) / pxPerUnitY
  const heightRefW = thUnits / meanAspect
  const thMax = heightRefW * maxAspect
  const stepUnits = thUnits * STEP_RATIO
  const waveScale = thUnits / TH_TUNED_REF

  // How tall the beach viewBox would need to be for the ART ALONE to reach the content
  // bottom (bgHeight >= contentHeight + verticalOffset — the point where computeCoverage
  // yields p = 1). The queue grows toward that, but never past its cap; the shortfall is
  // exactly what wakes the deficit-driven parallax up.
  const viewHNeeded = (contentHeight + verticalOffset - baseHeightPx) / pxPerUnitY
  const nCap = viewportWidth >= WIDE_BREAKPOINT ? N_CAP_WIDE : N_CAP_NARROW
  const nNeeded = Math.ceil(
    (viewHNeeded - QUEUE_SHORE_CY - thMax / 2 - SEA_MARGIN) / stepUnits,
  )
  const n = clamp(N_MIN, Number.isFinite(nNeeded) ? nNeeded : N_MIN, nCap)

  const travel = n * stepUnits
  const spawnCy = QUEUE_SHORE_CY + travel
  // FLOOR at the authored art height: shrinking the viewBox below it would crop the
  // real beach, not just the surplus water.
  const beachViewH = Math.max(BEACH_ART_H, spawnCy + thMax / 2 + SEA_MARGIN)
  const durSeconds = travel / QUEUE_SPEED

  return {
    n, heightRefW, thUnits, thMax, stepUnits, travel,
    shoreCy: QUEUE_SHORE_CY, spawnCy, beachViewH, durSeconds, waveScale,
  }
}

function degenerate(meanAspect: number, maxAspect: number): WaveQueueLayout {
  const heightRefW = VIEWBOX_W * 1.5 // the old tuned reference
  const safeMean = meanAspect > 0 ? meanAspect : 0.311389
  const safeMax = maxAspect > 0 ? maxAspect : 0.364198
  const thUnits = heightRefW * safeMean
  const stepUnits = thUnits * STEP_RATIO
  const travel = N_MIN * stepUnits
  return {
    n: N_MIN,
    heightRefW,
    thUnits,
    thMax: heightRefW * safeMax,
    stepUnits,
    travel,
    shoreCy: QUEUE_SHORE_CY,
    spawnCy: QUEUE_SHORE_CY + travel,
    beachViewH: BEACH_ART_H,
    durSeconds: travel / QUEUE_SPEED,
    waveScale: thUnits / TH_TUNED_REF,
  }
}
