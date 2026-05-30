'use client'

import { useEffect, type RefObject } from 'react'

const MAX_DEGREES   = 4
const SMOOTHING     = 0.07
const DECAY         = 0.88
const VELOCITY_SENS = 0.15
const IDLE_FRAMES   = 20

// Big tree bottom-center in SVG viewBox coordinates (800 × 2047)
// cx = 712 / 800 = 89.0%,  cy = 950 / 2047 = 46.4%
const ORIGIN_X = '89%'
const ORIGIN_Y = '46.4%'

export function useBigTreeAnimation(
  layerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean },
): void {
  useEffect(() => {
    if (!enabled) return
    const el = layerRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    el.style.transformOrigin = `${ORIGIN_X} ${ORIGIN_Y}`

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
