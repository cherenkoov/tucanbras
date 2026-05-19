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

    // "cabine group" ID has a space — must use attribute selector
    const cabine1 = container.querySelector<SVGElement>('[id="cabine group"]')
    const pathFwd = container.querySelector<SVGPathElement>('#cabine-anim-path')
    const pathRev = container.querySelector<SVGPathElement>('#cabine-anim-path-rev')

    if (!cabine1 || !pathFwd || !pathRev) {
      console.warn('useCarAnimation: [id="cabine group"], #cabine-anim-path, or #cabine-anim-path-rev not found in DOM')
      return
    }

    // Clone cabine to create a second cabin travelling in the opposite direction
    const cabine2 = cabine1.cloneNode(true) as SVGElement
    cabine2.setAttribute('id', 'cabine-clone')
    // Remove all nested IDs to avoid duplicates in DOM
    cabine2.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'))
    cabine1.parentElement!.appendChild(cabine2)

    // Cabin 1: upper-right → lower-left along forward path
    const tl1 = gsap.timeline({ repeat: -1, paused: true })
    tl1.to(cabine1, {
      motionPath: {
        path: pathFwd,
        // autoRotate off — cabin body stays upright, held by gravity like a real cable car
        autoRotate: false,
        align: pathFwd,
        // [0.5, 0] = top-center of bounding box on the cable (roll/wheel attachment point)
        alignOrigin: [0.5, 0],
      },
      duration: CAR_DURATION,
      ease: 'none',
    })

    // Cabin 2: lower-left → upper-right along reverse path, offset by half a lap
    const tl2 = gsap.timeline({ repeat: -1, paused: true })
    tl2.to(cabine2, {
      motionPath: {
        path: pathRev,
        autoRotate: false,
        align: pathRev,
        alignOrigin: [0.5, 0],
      },
      duration: CAR_DURATION,
      ease: 'none',
    })
    tl2.seek(CAR_DURATION / 2)

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { tl1.play(); tl2.play() }
        else { tl1.pause(); tl2.pause() }
      },
      { rootMargin: `${VISIBILITY_MARGIN} 0px ${VISIBILITY_MARGIN} 0px`, threshold: 0 }
    )
    observer.observe(cabine1)

    return () => {
      tl1.kill()
      tl2.kill()
      observer.disconnect()
      cabine2.remove()
    }
  }, [enabled, containerRef])
}
