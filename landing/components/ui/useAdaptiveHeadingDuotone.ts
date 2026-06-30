'use client'

import { useEffect, type RefObject } from 'react'

// The collage SVGs injected by BackgroundCanvas all carry this viewBox, so querying it
// gives the collage's on-screen box (including any parallax / BG_SHIFT transforms)
// without coupling to BackgroundCanvas internals or editing that file.
const COLLAGE_VIEWBOX = '0 0 800 2047'
const COLLAGE_SRC = '/SVG/background/background-collage.svg'
// The collage is fetched async by BackgroundCanvas; poll up to ~5s for it to appear.
const FIND_TIMEOUT_FRAMES = 300

// Drives the duotone adaptive heading: fills the glyphs with the slice of the collage
// art directly behind them (background-clip:text) and keeps that fill aligned as the
// background's on-screen position changes (scroll / BG_SHIFT / resize). The SVG
// `#adaptive-duotone` filter (rendered by AdaptiveHeading) maps that slice's luminance
// onto the ink↔cream axis. DOM is written directly via the ref, never React state.
export function useAdaptiveHeadingDuotone(
  ref: RefObject<HTMLElement | null>,
  { enabled }: { enabled: boolean },
): void {
  useEffect(() => {
    if (!enabled) return
    const el = ref.current
    if (!el) return

    // Progressive enhancement: the heading renders as solid ink until the collage is
    // found, then we switch it to the clipped duotone fill. If the collage never loads
    // (or JS is off) the heading stays readable as solid ink.
    let enhanced = false
    const enhance = () => {
      if (enhanced) return
      enhanced = true
      el.style.backgroundImage = `url(${COLLAGE_SRC})`
      el.style.backgroundRepeat = 'no-repeat'
      el.style.setProperty('-webkit-background-clip', 'text')
      el.style.setProperty('background-clip', 'text')
      el.style.filter = 'url(#adaptive-duotone)'
      el.style.color = 'transparent'
    }
    const unenhance = () => {
      enhanced = false
      el.style.backgroundImage = ''
      el.style.backgroundRepeat = ''
      el.style.removeProperty('-webkit-background-clip')
      el.style.removeProperty('background-clip')
      el.style.filter = ''
      el.style.color = ''
    }

    let lastKey = ''
    // Size + position the collage-art fill so the slice inside each glyph matches what
    // is actually painted behind it on screen. Returns false until the collage exists.
    const sync = (): boolean => {
      const collage = document.querySelector<SVGSVGElement>(`svg[viewBox="${COLLAGE_VIEWBOX}"]`)
      if (!collage) return false
      const cr = collage.getBoundingClientRect()
      if (cr.width === 0) return false
      enhance()
      const hr = el.getBoundingClientRect()
      const key = `${cr.width}|${cr.height}|${cr.left - hr.left}|${cr.top - hr.top}`
      if (key === lastKey) return true
      lastKey = key
      el.style.backgroundSize = `${cr.width}px ${cr.height}px`
      el.style.backgroundPosition = `${cr.left - hr.left}px ${cr.top - hr.top}px`
      return true
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let cancelled = false
    let cleanup = () => {}

    const setup = (): (() => void) => {
      sync()
      const ro = new ResizeObserver(() => sync())
      ro.observe(document.documentElement)

      // Reduced motion: align once + on resize, but no scroll-driven updates.
      if (reduced) return () => ro.disconnect()

      let rafId: number | null = null
      let near = false
      const onFrame = () => { rafId = null; sync() }
      const schedule = () => { if (near && rafId === null) rafId = requestAnimationFrame(onFrame) }

      // Only track while the heading is near the viewport.
      const io = new IntersectionObserver(
        ([e]) => { near = e.isIntersecting; if (near) sync() },
        { threshold: 0, rootMargin: '300px 0px' },
      )
      io.observe(el)
      window.addEventListener('scroll', schedule, { passive: true })

      return () => {
        window.removeEventListener('scroll', schedule)
        if (rafId !== null) cancelAnimationFrame(rafId)
        io.disconnect()
        ro.disconnect()
      }
    }

    // Wait for the collage to be in the DOM (BackgroundCanvas fetches it async).
    let frames = 0
    const wait = () => {
      if (cancelled) return
      const collage = document.querySelector<SVGSVGElement>(`svg[viewBox="${COLLAGE_VIEWBOX}"]`)
      if (collage && collage.getBoundingClientRect().width > 0) cleanup = setup()
      else if (++frames < FIND_TIMEOUT_FRAMES) requestAnimationFrame(wait)
      // else: give up; the heading keeps its solid ink fallback.
    }
    wait()

    return () => { cancelled = true; cleanup(); unenhance() }
  }, [ref, enabled])
}
