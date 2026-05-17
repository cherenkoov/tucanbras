'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(MotionPathPlugin)

const TRAIN_DURATION = 8   // seconds per lap
const VISIBILITY_MARGIN = '200px'

export function useTrainAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const train = container.querySelector<SVGElement>('#Train')
    const railPath = container.querySelector<SVGPathElement>('#rail-path')
    if (!train || !railPath) {
      console.warn('useTrainAnimation: #Train or #rail-path not found in DOM')
      return
    }

    const tl = gsap.timeline({ repeat: -1, paused: true })
    tl.to(train, {
      motionPath: {
        path: railPath,
        autoRotate: true,
        align: railPath,
        alignOrigin: [0.5, 0.5],
      },
      duration: TRAIN_DURATION,
      ease: 'none',
    })

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tl.play()
        else tl.pause()
      },
      { rootMargin: `${VISIBILITY_MARGIN} 0px ${VISIBILITY_MARGIN} 0px`, threshold: 0 }
    )
    observer.observe(train)

    return () => {
      tl.kill()
      observer.disconnect()
    }
  }, [enabled, containerRef])
}
