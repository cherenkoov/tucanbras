'use client'

import { useEffect, type RefObject } from 'react'
import { buildSilhouetteMask, computeMaskPlacement, type Bbox } from './adaptiveHeadingMask'

// Stop the RAF after this many frames with no placement change (matches useScrollAnimation).
const IDLE_FRAMES = 20
// Give up looking for the figure after ~5s (the collage SVG is fetched async).
const FIND_TIMEOUT_FRAMES = 300

interface Options {
  baseRef: RefObject<HTMLElement | null>
  flipRef: RefObject<HTMLElement | null>
  figureId: string
  featherPx: number
  enabled: boolean
}

export function useAdaptiveHeadingColor({ baseRef, flipRef, figureId, featherPx, enabled }: Options): void {
  useEffect(() => {
    if (!enabled) return
    const flip = flipRef.current
    const base = baseRef.current
    if (!flip || !base) return

    // Write both the standard and -webkit- prefixed mask properties (Safari/older Chrome).
    const setMask = (prop: 'mask-image' | 'mask-size' | 'mask-position' | 'mask-repeat', val: string) => {
      flip.style.setProperty(prop, val)
      flip.style.setProperty('-webkit-' + prop, val)
    }

    // Wire the effect against a found figure element; returns its cleanup.
    const setup = (figure: SVGGraphicsElement): (() => void) => {
      // Silhouette geometry in the figure's own SVG user units. Assumes the figure's
      // <path> children carry no nested transforms (true for the chosen terrain figure;
      // confirmed in Task 4). getBBox is taken on the figure element itself.
      const box = figure.getBBox()
      const bbox: Bbox = { x: box.x, y: box.y, w: box.width, h: box.height }
      const paths = Array.from(figure.querySelectorAll('path'))
        .map(p => p.getAttribute('d'))
        .filter((d): d is string => !!d)
      if (paths.length === 0 || bbox.w === 0) return () => {}

      let padUnits = 0

      // Rebuild the mask data-URI for the current scale. featherPx is a fixed SCREEN px,
      // so in figure units it is featherPx / scale. Mount + every resize only.
      const rebuild = () => {
        const fr = figure.getBoundingClientRect()
        if (fr.width === 0) return
        const scale = fr.width / bbox.w
        const mask = buildSilhouetteMask({ paths, bbox, featherUnits: featherPx / scale })
        padUnits = mask.padUnits
        setMask('mask-repeat', 'no-repeat')
        setMask('mask-image', mask.dataUri)
      }

      // Per-frame: only mask-size / mask-position. Skip the DOM write when unchanged.
      let lastKey = ''
      const place = (): boolean => {
        const fr = figure.getBoundingClientRect()
        const hr = base.getBoundingClientRect()
        const pl = computeMaskPlacement({
          figureRect: { left: fr.left, top: fr.top, width: fr.width, height: fr.height },
          headingOrigin: { left: hr.left, top: hr.top },
          bbox,
          padUnits,
        })
        const key = `${pl.sizeW}|${pl.sizeH}|${pl.posX}|${pl.posY}`
        if (key === lastKey) return false
        lastKey = key
        setMask('mask-size', `${pl.sizeW}px ${pl.sizeH}px`)
        setMask('mask-position', `${pl.posX}px ${pl.posY}px`)
        return true
      }

      rebuild()
      place()

      // prefers-reduced-motion: position once, keep it aligned on resize, never animate.
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const roStatic = new ResizeObserver(() => { rebuild(); place() })
        roStatic.observe(document.documentElement)
        return () => roStatic.disconnect()
      }

      let rafId: number | null = null
      let idle = 0
      let near = false
      const stop = () => { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null } }
      const tick = () => {
        if (place()) idle = 0
        else if (++idle >= IDLE_FRAMES) { stop(); return }
        rafId = requestAnimationFrame(tick)
      }
      const start = () => { if (near && rafId === null) { idle = 0; rafId = requestAnimationFrame(tick) } }

      const io = new IntersectionObserver(
        ([e]) => { near = e.isIntersecting; if (near) start(); else stop() },
        { threshold: 0, rootMargin: '300px 0px' },
      )
      io.observe(base)

      const onScroll = () => start()
      window.addEventListener('scroll', onScroll, { passive: true })

      const ro = new ResizeObserver(() => { rebuild(); start() })
      ro.observe(document.documentElement)

      return () => {
        window.removeEventListener('scroll', onScroll)
        stop()
        io.disconnect()
        ro.disconnect()
      }
    }

    // The figure lives in BackgroundCanvas, whose SVG is fetched async — poll for it.
    // Ids may contain spaces (e.g. "Slope 1"), so use an attribute selector.
    let cancelled = false
    let cleanup: () => void = () => {}
    let frames = 0
    const wait = () => {
      if (cancelled) return
      const figure = document.querySelector<SVGGraphicsElement>(`[id="${figureId}"]`)
      if (figure) cleanup = setup(figure)
      else if (++frames < FIND_TIMEOUT_FRAMES) requestAnimationFrame(wait)
      else console.warn(`useAdaptiveHeadingColor: figure "${figureId}" not found`)
    }
    wait()

    return () => { cancelled = true; cleanup() }
  }, [baseRef, flipRef, figureId, featherPx, enabled])
}
