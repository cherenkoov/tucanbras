// Pure coverage math for the cover-zoom + coverage-parallax background.
// No DOM access — fully unit-testable (see scripts/verifyBackgroundCoverage.ts).
// Mirrors the spec 2026-06-28-background-coverage-cover-zoom-parallax §3.3 + §3.4.

export interface CoverageConfig {
  maxZoom: number   // crop ceiling, e.g. 1.6
  focalX: number    // art column kept centred when cropping, e.g. 0.45
  minP: number      // parallax floor, e.g. 0.3
}

export interface CoverageInput {
  naturalHeight: number   // rendered bg height at zoom = 1 (px)
  contentHeight: number   // H_content — <main> offsetTop + offsetHeight (px)
  viewportHeight: number  // H_vp (px)
  viewportWidth: number   // vw (px)
  motionEnabled: boolean
  config: CoverageConfig
}

export interface CoverageResult {
  zoom: number
  parallaxFactor: number  // p
  focalTranslateX: number // px (0 when zoom === 1)
  fillHeight: number      // px
  bgHeight: number        // H_bg
}

const clamp = (lo: number, v: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function computeCoverage(input: CoverageInput): CoverageResult {
  const {
    naturalHeight, contentHeight, viewportHeight, viewportWidth,
    motionEnabled, config,
  } = input
  const { maxZoom, focalX, minP } = config

  // Guard against degenerate measurements (pre-render / zero height).
  if (naturalHeight <= 0) {
    return { zoom: 1, parallaxFactor: 1, focalTranslateX: 0, fillHeight: 0, bgHeight: 0 }
  }

  const zoomFull = contentHeight / naturalHeight
  const zoom = clamp(1, zoomFull, maxZoom)
  const bgHeight = naturalHeight * zoom

  // Bias the crop toward the focal column (vw/2 − FOCAL_X·(vw·zoom) centres it), but
  // CLAMP so the widened container can never expose a page edge — otherwise the shift
  // that centres the focal on one screen leaves a bare vertical strip on another.
  // translateX ∈ [vw − containerWidth, 0]: at the low end the right edge is flush at vw,
  // at the high end the left edge is flush at 0. Side effect (by design): near-zero shift
  // on wide / low-zoom screens (focal stays at its natural, right-side spot), easing to a
  // fully-centred focal on high-zoom mobile where the extra width gives room to shift.
  const containerWidth = viewportWidth * zoom
  const focalTranslateX = clamp(
    viewportWidth - containerWidth,
    viewportWidth / 2 - focalX * containerWidth,
    0,
  )

  let parallaxFactor = 1
  let fillHeight = 0

  if (zoom < maxZoom) {
    // Wide / mid screens: zoom alone covers. No parallax, no fill.
    parallaxFactor = 1
    fillHeight = 0
  } else {
    // Cap hit (narrow screens).
    const S = contentHeight - viewportHeight // total scroll distance
    if (motionEnabled && S > 0) {
      const pNeeded = (bgHeight - viewportHeight) / S
      parallaxFactor = clamp(minP, pNeeded, 1)
      // 0 unless p clamped at minP (extreme-height pages).
      fillHeight = Math.max(0, (viewportHeight + parallaxFactor * S) - bgHeight)
    } else {
      // Reduced motion / weak device: static terminal band covers the remainder.
      parallaxFactor = 1
      fillHeight = Math.max(0, contentHeight - bgHeight)
    }
  }

  return { zoom, parallaxFactor, focalTranslateX, fillHeight, bgHeight }
}
