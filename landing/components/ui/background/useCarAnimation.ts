'use client'

import { useEffect, type RefObject } from 'react'
import { CABINE_SVG_INNER } from './cabinePaths'

const SVG_W = 800

// Cabine visual bounding box in SVG user units
// roll top (y=641) is the cable-attachment anchor; offset-anchor: 50% 0% puts it on the path
const CABINE = { x: 203, y: 641, w: 50, h: 77 } as const

// Cabine 1: upper-right → lower-left (downward)
const PATH_FWD = 'M441 480 L398 515.5 C275.822 617.351 183.197 678.169 -1 769 L-54 787'
// Cabine 2: lower-left → upper-right (upward)
const PATH_REV = 'M-54 787 L-1 769 C183.197 678.169 275.822 617.351 398 515.5 L441 480'

const KEYFRAME_ID = 'cabine-overlay-kf'

function scalePath(d: string, s: number): string {
  return d.replace(/-?\d+(?:\.\d+)?/g, n => (parseFloat(n) * s).toFixed(2))
}

function ensureKeyframes() {
  if (document.getElementById(KEYFRAME_ID)) return
  const st = document.createElement('style')
  st.id = KEYFRAME_ID
  st.textContent = `
    @keyframes cabine-fwd { from { offset-distance: 0% } to { offset-distance: 100% } }
    @keyframes cabine-rev { from { offset-distance: 0% } to { offset-distance: 100% } }
  `
  document.head.appendChild(st)
}

function createOverlaySvg(animName: string, delay: string): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `${CABINE.x} ${CABINE.y} ${CABINE.w} ${CABINE.h}`)
  svg.setAttribute('overflow', 'visible')
  svg.innerHTML = CABINE_SVG_INNER

  svg.style.cssText =
    'position:absolute;top:0;left:0;pointer-events:none;' +
    `animation:${animName} 12s linear infinite paused;animation-delay:${delay};` +
    'visibility:hidden;'
  svg.style.setProperty('offset-anchor', '50% 0%')
  svg.style.setProperty('offset-rotate', '0deg')

  return svg
}

export function useCarAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    ensureKeyframes()

    const el = container

    // Cabine 1: downward (upper-right → lower-left), cabine-fwd keyframes
    // Cabine 2: upward  (lower-left → upper-right), cabine-rev keyframes, offset by half-cycle
    const svg1 = createOverlaySvg('cabine-fwd', '0s')
    const svg2 = createOverlaySvg('cabine-rev', '-6s')
    el.appendChild(svg1)
    el.appendChild(svg2)

    function applyScale() {
      const s = el.offsetWidth / SVG_W
      const w = `${(CABINE.w * s).toFixed(1)}px`
      const h = `${(CABINE.h * s).toFixed(1)}px`
      svg1.style.width = w; svg1.style.height = h
      svg1.style.setProperty('offset-path', `path('${scalePath(PATH_FWD, s)}')`)
      svg2.style.width = w; svg2.style.height = h
      svg2.style.setProperty('offset-path', `path('${scalePath(PATH_REV, s)}')`)
    }
    applyScale()

    const ro = new ResizeObserver(() => applyScale())
    ro.observe(el)

    const sentinel = document.createElement('div')
    sentinel.style.cssText = 'position:absolute;top:20%;left:0;width:100%;height:22%;pointer-events:none;'
    el.appendChild(sentinel)

    let revealed = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!revealed) {
            revealed = true
            svg1.style.visibility = ''
            svg2.style.visibility = ''
          }
          svg1.style.animationPlayState = 'running'
          svg2.style.animationPlayState = 'running'
        } else {
          svg1.style.animationPlayState = 'paused'
          svg2.style.animationPlayState = 'paused'
        }
      },
      { rootMargin: '200px 0px 200px 0px', threshold: 0 }
    )
    observer.observe(sentinel)

    return () => {
      svg1.remove()
      svg2.remove()
      sentinel.remove()
      ro.disconnect()
      observer.disconnect()
    }
  }, [enabled, containerRef])
}
