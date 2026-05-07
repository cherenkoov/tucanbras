'use client'

import { useEffect, useRef, type RefObject } from 'react'

const ROTATE_X_MAX = 8
const ROTATE_Y_MAX = 15
const LERP_FACTOR  = 0.08
const MOBILE_SWAY  = 3
const MOBILE_SWAY_SPEED = 4000

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function useStatueRotation(
  elementRef: RefObject<HTMLElement | null>
) {
  const rotX    = useRef(0)
  const rotY    = useRef(0)
  const targetX = useRef(0)
  const targetY = useRef(0)
  const rafId   = useRef<number>(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = elementRef.current
    if (!el) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const isMobile = window.matchMedia('(hover: none) and (pointer: coarse)').matches

    if (isMobile) {
      const startTime = performance.now()
      const tick = (now: number) => {
        const t = (now - startTime) / MOBILE_SWAY_SPEED
        const angle = Math.sin(t * Math.PI * 2) * MOBILE_SWAY
        el.style.transform = `rotateY(${angle}deg) rotateX(0deg)`
        rafId.current = requestAnimationFrame(tick)
      }
      rafId.current = requestAnimationFrame(tick)
    } else {
      const onMouseMove = (e: MouseEvent) => {
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        targetY.current =  ((e.clientX - cx) / cx) * ROTATE_Y_MAX
        targetX.current = -((e.clientY - cy) / cy) * ROTATE_X_MAX
      }
      window.addEventListener('mousemove', onMouseMove, { passive: true })

      const tick = () => {
        rotX.current = lerp(rotX.current, targetX.current, LERP_FACTOR)
        rotY.current = lerp(rotY.current, targetY.current, LERP_FACTOR)
        el.style.transform = `rotateY(${rotY.current}deg) rotateX(${rotX.current}deg)`
        rafId.current = requestAnimationFrame(tick)
      }
      rafId.current = requestAnimationFrame(tick)

      return () => {
        window.removeEventListener('mousemove', onMouseMove)
        cancelAnimationFrame(rafId.current)
      }
    }

    return () => cancelAnimationFrame(rafId.current)
  }, [elementRef])
}
