'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'

const CLOUD_SIDES: Record<string, 'left' | 'right'> = {
  'Cloud 06':   'left',
  'Cloud 07':   'left',
  'Cloud 05':   'left',
  'Cloud 01_2': 'left',
  'Cloud 03':   'right',
  'Cloud 02':   'right',
  'Cloud 01':   'right',
}

// How far off-screen each cloud starts (in SVG user units, ~px at 100% width)
const SLIDE_OFFSET = 160

export function useCloudAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tweens: gsap.core.Tween[] = []

    Object.entries(CLOUD_SIDES).forEach(([id, side], i) => {
      const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
      if (!el) return

      const offset = side === 'left' ? -SLIDE_OFFSET : SLIDE_OFFSET
      gsap.set(el, { x: offset, opacity: 0 })

      tweens.push(
        gsap.to(el, {
          x: 0,
          opacity: 1,
          duration: 1.8,
          ease: 'power2.out',
          delay: 0.2 + i * 0.1,
        })
      )
    })

    return () => tweens.forEach(t => t.kill())
  }, [enabled, containerRef])
}
