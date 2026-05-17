'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'

const BUSH_SIDES: Record<string, 'left' | 'right'> = {
  'bush 01': 'left',
  'bush 02': 'right',
}

const SLIDE_OFFSET = 50

export function useBushAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tweens: gsap.core.Tween[] = []

    const observers: IntersectionObserver[] = []

    Object.entries(BUSH_SIDES).forEach(([id, side], i) => {
      const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
      if (!el) return

      const offset = side === 'left' ? SLIDE_OFFSET : -SLIDE_OFFSET
      let played = false

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !played) {
            played = true
            gsap.set(el, { scale: 1, transformOrigin: 'center bottom' })
            tweens.push(
              gsap.to(el, {
                x: offset,
                scale: 1.2,
                duration: 1.8,
                ease: 'power1.inOut',
                delay: i * 0.1,
              })
            )
            observer.disconnect()
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => {
      tweens.forEach(t => t.kill())
      observers.forEach(o => o.disconnect())
    }
  }, [enabled, containerRef])
}
