// Pure coverage math for the cover-zoom + coverage-parallax background.
// No DOM access — fully unit-testable (see scripts/verifyBackgroundCoverage.ts).
// Mirrors the spec 2026-06-28-background-coverage-cover-zoom-parallax §3.3 + §3.4.

export interface CoverageConfig {
  maxZoom: number   // crop ceiling, e.g. 1.6
  focalX: number    // art column kept centred when cropping, e.g. 0.45
  minP: number      // parallax floor, e.g. 0.3
  // Horizontal framing curve: where in the viewport the focal column sits, as a
  // fraction of vw, eased from `focalAnchorNarrow` (phones) to `focalAnchorWide`
  // (tablets+) across [focalAnchorStart, focalAnchorEnd] px. 0.5 = centred; larger
  // = further right. Lets phones keep the statue centred while tablets+ push it to
  // the right edge (mirroring the hero card on the left).
  focalAnchorNarrow: number
  focalAnchorWide: number
  focalAnchorStart: number
  focalAnchorEnd: number
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
  const {
    maxZoom, focalX, minP,
    focalAnchorNarrow, focalAnchorWide, focalAnchorStart, focalAnchorEnd,
  } = config

  // Guard against degenerate measurements (pre-render / zero height).
  if (naturalHeight <= 0) {
    return { zoom: 1, parallaxFactor: 1, focalTranslateX: 0, fillHeight: 0, bgHeight: 0 }
  }

  const zoomFull = contentHeight / naturalHeight
  const zoom = clamp(1, zoomFull, maxZoom)
  const bgHeight = naturalHeight * zoom

  // Horizontal framing: place the focal column at `focalAnchor · vw`, eased from
  // `focalAnchorNarrow` (phones — 0.5, centred) to `focalAnchorWide` (tablets+ — right
  // edge) across [focalAnchorStart, focalAnchorEnd] with an ease-in (t²) so phones stay
  // fully centred and the shift only ramps up once past the phone range. Then CLAMP the
  // resulting translate so the widened container can never expose a page edge:
  // translateX ∈ [vw − containerWidth, 0] (right edge flush at vw / left edge flush at 0).
  const anchorSpan = focalAnchorEnd - focalAnchorStart
  const anchorT = anchorSpan > 0
    ? clamp(0, (viewportWidth - focalAnchorStart) / anchorSpan, 1)
    : (viewportWidth >= focalAnchorEnd ? 1 : 0)
  const focalAnchor = focalAnchorNarrow + (focalAnchorWide - focalAnchorNarrow) * (anchorT * anchorT)
  const containerWidth = viewportWidth * zoom
  const focalTranslateX = clamp(
    viewportWidth - containerWidth,
    focalAnchor * viewportWidth - focalX * containerWidth,
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
