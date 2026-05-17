'use client'

import { useEffect, type RefObject } from 'react'

const PARALLAX_FACTOR = 0.4

export function useParallaxBackground(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const el = containerRef.current
    if (!el) return

    // Disabled on touch-only devices — parallax is jarring without a mouse
    if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let rafId: number | null = null
    let lastApplied = -1

    const onScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const scrollY = window.scrollY
        if (scrollY === lastApplied) return
        lastApplied = scrollY
        el.style.transform = `translateY(${-scrollY * PARALLAX_FACTOR}px)`
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      el.style.transform = ''
    }
  }, [enabled, containerRef])
}
