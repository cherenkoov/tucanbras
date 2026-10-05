import { useEffect, useState, useCallback } from 'react'
import { computeCoverage, type CoverageConfig, type CoverageResult } from './backgroundCoverage'

export interface CoverageMeasurements {
  /** container's rendered width (px) — includes the cover-zoom */
  containerWidth: number
  /** the beach's offset within the container (px) — everything ABOVE the beach.
   *  0 until the beach SVG is injected; the layout converges on the next pass. */
  baseHeightPx: number
  /** net UPWARD translate on the container = sceneLift − BG_SHIFT */
  verticalOffset: number
}

const INITIAL: CoverageResult & CoverageMeasurements = {
  zoom: 1, parallaxFactor: 1, focalTranslateX: 0, fillHeight: 0, bgHeight: 0,
  containerWidth: 0, baseHeightPx: 0, verticalOffset: 0,
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useBackgroundCoverage(
  containerRef: React.RefObject<HTMLDivElement | null>,
  beachRef: React.RefObject<HTMLDivElement | null>,
  config: CoverageConfig,
  deps: { ready: boolean; sceneLift: number },
): CoverageResult & CoverageMeasurements {
  const { ready, sceneLift } = deps
  const [result, setResult] = useState<CoverageResult & CoverageMeasurements>(INITIAL)

  const measure = useCallback(() => {
    const container = containerRef.current
    const main = document.querySelector('main')
    if (!container || !main) return

    // Read the CURRENT zoom we applied (width %) so we can derive the zoom-1
    // natural height: height ∝ width, so natural = renderedHeight / currentZoom.
    // Parse from the inline width style we set in Task 3 (e.g. "160%"); default 1.
    const widthStyle = container.style.width // "" | "100%" | "160%" | ...
    const currentZoom = widthStyle.endsWith('%') ? parseFloat(widthStyle) / 100 || 1 : 1

    const containerRect = container.getBoundingClientRect()
    const renderedHeight = containerRect.height
    const naturalHeight = renderedHeight / currentZoom

    // H_content — the <main> element's full extent on the page.
    const contentHeight = main.offsetTop + main.offsetHeight

    // Centre the crop on the Christ statue: measure #Peak's anchor column (the same
    // 2/5-of-Peak point ChristScene is pinned to) as a fraction of the container width.
    // The fraction is invariant to the current zoom/translateX (both rects carry them),
    // so it converges in one pass. Fall back to the config value if Peak isn't in yet.
    let focalX = config.focalX
    const peak = container.querySelector<SVGGraphicsElement>('#Peak')
    if (peak && containerRect.width > 0) {
      const peakRect = peak.getBoundingClientRect()
      const peakColumnX = (peakRect.left - containerRect.left) + peakRect.width * (2 / 5)
      focalX = peakColumnX / containerRect.width
    }

    // Net UPWARD shift applied to the container: sceneLift (start the statue head on
    // the hero line) minus BG_SHIFT (mobile descent). KEEP the BG_SHIFT formula in
    // sync with BG_SHIFT in BackgroundCanvas.tsx. Without this term the fill band
    // stops sceneLift px short of the page bottom, exposing a cream gap.
    const bgShiftPx = Math.min(400, Math.max(0, (1024 - window.innerWidth) * 400 / 649))
    const verticalOffset = sceneLift - bgShiftPx

    // The beach's offset within the container == everything above it. Measured, not
    // modelled, because the beach carries a negative marginTop that pulls it up into the
    // collage. Before the beach SVG is injected its rect height is 0 and its top sits at
    // the collage's bottom — the layout simply converges on the next measurement pass.
    const beach = beachRef.current
    const baseHeightPx = beach
      ? beach.getBoundingClientRect().top - containerRect.top
      : containerRect.height

    const next = computeCoverage({
      naturalHeight,
      contentHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      motionEnabled: !prefersReducedMotion(),
      config: { ...config, focalX },
      verticalOffset,
    })

    const merged = {
      ...next,
      containerWidth: containerRect.width,
      baseHeightPx,
      verticalOffset,
    }

    // Compared WITH a tolerance, not ===. Every input here is a getBoundingClientRect read
    // off a container this result itself resizes, so sub-pixel rounding comes back as a
    // "new" zoom: a phone was measured cycling 400.141% ↔ 400.144% forever, a re-render
    // every ~500ms that also kept restarting the wave bake's debounce. Under a quarter
    // pixel (zoom: 1e-3 of the viewport ≈ 0.4px at 390) is not a layout change.
    const near = (a: number, b: number, eps: number) => Math.abs(a - b) < eps
    setResult(prev =>
      near(prev.zoom, merged.zoom, 1e-3) &&
      near(prev.parallaxFactor, merged.parallaxFactor, 1e-4) &&
      near(prev.focalTranslateX, merged.focalTranslateX, 0.5) &&
      near(prev.fillHeight, merged.fillHeight, 0.5) &&
      near(prev.bgHeight, merged.bgHeight, 0.5) &&
      near(prev.containerWidth, merged.containerWidth, 0.5) &&
      near(prev.baseHeightPx, merged.baseHeightPx, 0.5) &&
      near(prev.verticalOffset, merged.verticalOffset, 0.5)
        ? prev
        : merged,
    )
  }, [containerRef, beachRef, config, sceneLift])

  useEffect(() => {
    if (!ready) return
    measure()

    const main = document.querySelector('main')
    const ro = new ResizeObserver(measure)
    if (main) ro.observe(main)
    // The container too: the wave bake re-injects the beach at a different height, and the
    // zoom depends on that height. Watching only <main> left the zoom stale until some
    // unrelated event re-measured — on a loaded phone ~1s later, as a visible jump
    // (100% → 400% → 535% across 6s, measured 2026-10-04). Converges: measure() is
    // idempotent at a fixed natural height, and setResult drops an unchanged result.
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', measure)
    // Re-measure after web fonts settle (font swap changes content height).
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {})
    }

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ready, measure, containerRef])

  return result
}
