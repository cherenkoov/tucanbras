'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'

const SLIDE_OFFSET = 50

export function useBushAnimation(
  bush01Ref: RefObject<HTMLDivElement | null>,
  bush02Ref: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tweens: gsap.core.Tween[] = []
    const observers: IntersectionObserver[] = []

    const entries: [RefObject<HTMLDivElement | null>, number][] = [
      [bush01Ref, SLIDE_OFFSET],
      [bush02Ref, -SLIDE_OFFSET],
    ]

    entries.forEach(([ref, offset], i) => {
      const el = ref.current
      if (!el) return

      let played = false

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !played) {
            played = true
            gsap.set(el, { scale: 1, transformOrigin: 'center 55%' })
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
  }, [enabled, bush01Ref, bush02Ref])
}
