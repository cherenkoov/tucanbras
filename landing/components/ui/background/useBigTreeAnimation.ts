'use client'

import { useEffect, type RefObject } from 'react'

const MAX_DEGREES   = 4
const SMOOTHING     = 0.07
const DECAY         = 0.88
const VELOCITY_SENS = 0.15
const IDLE_FRAMES   = 20

// Big tree pivot (its bottom-center) in CANVAS units of the 800 × 2047 collage.
// Converted to % of the wrapper svg's own viewBox at runtime — the wrapper is a
// BOUNDED sprite box, not the full canvas, so hardcoded canvas percentages would
// pivot the sway around the wrong point.
const PIVOT = { x: 712, y: 950 } as const

export function useBigTreeAnimation(
  layerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean },
): void {
  useEffect(() => {
    if (!enabled) return
    const el = layerRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const vb = el.querySelector('svg')?.viewBox.baseVal
    if (!vb || vb.width === 0 || vb.height === 0) return
    el.style.transformOrigin = `${(((PIVOT.x - vb.x) / vb.width) * 100).toFixed(2)}% ${(((PIVOT.y - vb.y) / vb.height) * 100).toFixed(2)}%`

    let target    = 0
    let current   = 0
    let lastY     = window.scrollY
    let rafId:    number | null = null
    let idleCount = 0

    const stopRAF = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    }

    const tick = () => {
      target  *= DECAY
      current += (target - current) * SMOOTHING
      el.style.transform = `rotate(${current.toFixed(3)}deg)`
      if (Math.abs(target) < 0.001) {
        if (++idleCount >= IDLE_FRAMES) { stopRAF(); return }
      } else {
        idleCount = 0
      }
      rafId = requestAnimationFrame(tick)
    }

    const startRAF = () => {
      if (rafId !== null) return
      idleCount = 0
      rafId = requestAnimationFrame(tick)
    }

    const onScroll = () => {
      const delta = window.scrollY - lastY
      lastY = window.scrollY
      target = Math.max(-MAX_DEGREES, Math.min(MAX_DEGREES, -delta * VELOCITY_SENS))
      startRAF()
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      stopRAF()
      el.style.transform = ''
      el.style.transformOrigin = ''
    }
  }, [enabled, layerRef])
}
