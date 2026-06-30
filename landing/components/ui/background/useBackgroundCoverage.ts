import { useEffect, useState, useCallback } from 'react'
import { computeCoverage, type CoverageConfig, type CoverageResult } from './backgroundCoverage'

const INITIAL: CoverageResult = {
  zoom: 1, parallaxFactor: 1, focalTranslateX: 0, fillHeight: 0, bgHeight: 0,
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useBackgroundCoverage(
  containerRef: React.RefObject<HTMLDivElement | null>,
  config: CoverageConfig,
  deps: { ready: boolean },
): CoverageResult {
  const { ready } = deps
  const [result, setResult] = useState<CoverageResult>(INITIAL)

  const measure = useCallback(() => {
    const container = containerRef.current
    const main = document.querySelector('main')
    if (!container || !main) return

    // Read the CURRENT zoom we applied (width %) so we can derive the zoom-1
    // natural height: height ∝ width, so natural = renderedHeight / currentZoom.
    // Parse from the inline width style we set in Task 3 (e.g. "160%"); default 1.
    const widthStyle = container.style.width // "" | "100%" | "160%" | ...
    const currentZoom = widthStyle.endsWith('%') ? parseFloat(widthStyle) / 100 || 1 : 1

    const renderedHeight = container.getBoundingClientRect().height
    const naturalHeight = renderedHeight / currentZoom

    // H_content — the <main> element's full extent on the page.
    const contentHeight = main.offsetTop + main.offsetHeight

    const next = computeCoverage({
      naturalHeight,
      contentHeight,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      motionEnabled: !prefersReducedMotion(),
      config,
    })

    setResult(prev =>
      prev.zoom === next.zoom &&
      prev.parallaxFactor === next.parallaxFactor &&
      prev.focalTranslateX === next.focalTranslateX &&
      prev.fillHeight === next.fillHeight &&
      prev.bgHeight === next.bgHeight
        ? prev
        : next,
    )
  }, [containerRef, config])

  useEffect(() => {
    if (!ready) return
    measure()

    const main = document.querySelector('main')
    const ro = new ResizeObserver(measure)
    if (main) ro.observe(main)
    window.addEventListener('resize', measure)
    // Re-measure after web fonts settle (font swap changes content height).
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measure).catch(() => {})
    }

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ready, measure])

  return result
}
