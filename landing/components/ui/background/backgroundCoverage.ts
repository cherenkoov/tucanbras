// Pure coverage math for the cover-zoom + coverage-parallax background.
// No DOM access — fully unit-testable (see scripts/verifyBackgroundCoverage.ts).
// Mirrors the spec 2026-06-28-background-coverage-cover-zoom-parallax §3.3 + §3.4.

import { WIDE_BREAKPOINT } from './waveQueueLayout'

export interface CoverageConfig {
  maxZoom: number   // crop ceiling below WIDE_BREAKPOINT, e.g. 2.0
  // Crop ceiling AT/ABOVE WIDE_BREAKPOINT. Separate because the two widths fill empty
  // space by different means: mobile leans on cover-zoom, desktop must lean on parallax.
  // Without this, shortening the sea just hands the space back to the zoom, which
  // magnifies every wave again — the exact bug this is fixing.
  maxZoomWide: number
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
  // Net UPWARD translate applied to the whole background container, in px
  // (= sceneLift − BG_SHIFT: the statue-head lift minus the mobile descent).
  // The art's bottom edge therefore lands this many px HIGHER than its height
  // implies, so the coverage/fill math must add it back to reach the page bottom.
  // Optional (defaults to 0) so pre-lift measurements and tests stay valid.
  verticalOffset?: number
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
    motionEnabled, config, verticalOffset = 0,
  } = input
  const {
    maxZoom, maxZoomWide, focalX, minP,
    focalAnchorNarrow, focalAnchorWide, focalAnchorStart, focalAnchorEnd,
  } = config

  // Guard against degenerate measurements (pre-render / zero height).
  if (naturalHeight <= 0) {
    return { zoom: 1, parallaxFactor: 1, focalTranslateX: 0, fillHeight: 0, bgHeight: 0 }
  }

  // Wide screens get their own, tighter crop ceiling. The two width classes close empty
  // space by different means: narrow ones lean on cover-zoom, wide ones must lean on the
  // deficit-driven parallax below. Without the split, shortening the sea band lowers
  // naturalHeight, zoomFull climbs past 1, and the zoom simply takes the freed space back
  // — magnifying every wave again, which is the bug being fixed. Measured: at 1024 the art
  // has zero surplus today (bgHeight == contentHeight), so a shortened sea puts zoomFull
  // at 1.16 there. Capping is a no-op for the statue's framing, because focalTranslateX
  // already measures 0 at every width on a production build.
  const zoomCeiling = viewportWidth >= WIDE_BREAKPOINT ? maxZoomWide : maxZoom
  const zoomFull = contentHeight / naturalHeight
  const zoom = clamp(1, zoomFull, zoomCeiling)
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

  // The container is translated UP by `verticalOffset`, so its bottom edge sits at
  // (bgHeight − verticalOffset) at scroll 0 and — with parallax lag p — descends to
  // (bgHeight − verticalOffset + (1 − p)·S) at the page bottom. Requiring that edge
  // (plus the terminal fill) to reach the content bottom at every scroll position
  // yields, at the worst case (scroll = S):
  //     fillHeight ≥ H_vp + p·S − H_bg + verticalOffset.
  // This is the ORIGINAL fill formula with `+ verticalOffset` added — the term that
  // was missing, which left a gap at the page bottom on widths where the zoomed art
  // only barely exceeded the content height.
  const S = contentHeight - viewportHeight // total scroll distance

  // Parallax engages on the COVERAGE DEFICIT alone — the moment the (up-shifted) art
  // stops reaching the content bottom — not on hitting the zoom cap. `pNeeded < 1`
  // exactly means "H_bg, lifted by verticalOffset, is shorter than the page", so:
  //   • fully covered (pNeeded ≥ 1) → p = 1 → no scroll motion (wide screens);
  //   • small deficit → p ≈ 1 → a faint lag that closes the gap with real art;
  //   • large deficit (mobile) → small p → strong lag revealing the art's lower band;
  //   • deficit beyond the minP floor → p = minP and the terminal fill covers the rest.
  // The lag magnitude auto-scales with need, so this one rule subsumes the old
  // cap-gated branch AND the static desktop fill, with no fixed space-filling guess.
  let parallaxFactor = 1
  if (motionEnabled && S > 0) {
    const pNeeded = (bgHeight - viewportHeight - verticalOffset) / S
    parallaxFactor = clamp(minP, pNeeded, 1)
  }
  // Terminal band closes whatever parallax (floored at minP) or the reduced-motion /
  // non-scrolling static case leaves below the content bottom. With p = 1 this reduces
  // to max(0, H_content − H_bg + verticalOffset).
  const fillHeight = Math.max(0, viewportHeight + parallaxFactor * S - bgHeight + verticalOffset)

  return { zoom, parallaxFactor, focalTranslateX, fillHeight, bgHeight }
}
