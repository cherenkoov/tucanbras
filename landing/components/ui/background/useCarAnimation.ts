'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'

gsap.registerPlugin(MotionPathPlugin)

const CAR_DURATION = 12    // seconds per full cable lap
const VISIBILITY_MARGIN = '200px'

export function useCarAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cabine1 = container.querySelector<SVGElement>('#Cabine')
    const cabine2 = container.querySelector<SVGElement>('#Cabine_2')
    const cablePath = container.querySelector<SVGPathElement>('#cable-path')

    if (!cabine1 || !cabine2 || !cablePath) {
      console.warn('useCarAnimation: #Cabine, #Cabine_2, or #cable-path not found in DOM')
      return
    }

    // Cabin 1: travels start→end (0→1)
    const tl1 = gsap.timeline({ repeat: -1, paused: true })
    tl1.to(cabine1, {
      motionPath: {
        path: cablePath,
        autoRotate: true,
        align: cablePath,
        alignOrigin: [0.5, 0.5],
        start: 0,
        end: 1,
      },
      duration: CAR_DURATION,
      ease: 'none',
    })

    // Cabin 2: starts halfway along the path (0.5→1.5 = wraps to start again)
    const tl2 = gsap.timeline({ repeat: -1, paused: true })
    tl2.to(cabine2, {
      motionPath: {
        path: cablePath,
        autoRotate: true,
        align: cablePath,
        alignOrigin: [0.5, 0.5],
        start: 0.5,
        end: 1.5,
      },
      duration: CAR_DURATION,
      ease: 'none',
    })

    // Trigger both timelines together when cable car group enters viewport
    const cableCarGroup = container.querySelector('[id="Cable car"]') ?? cabine1.closest('g')

    const trigger = cableCarGroup ?? cabine1

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { tl1.play(); tl2.play() }
        else { tl1.pause(); tl2.pause() }
      },
      { rootMargin: `${VISIBILITY_MARGIN} 0px ${VISIBILITY_MARGIN} 0px`, threshold: 0 }
    )
    observer.observe(trigger)

    return () => {
      tl1.kill()
      tl2.kill()
      observer.disconnect()
    }
  }, [enabled, containerRef])
}
