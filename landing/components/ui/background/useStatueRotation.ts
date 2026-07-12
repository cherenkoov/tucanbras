'use client'

import { useEffect, useRef, type RefObject } from 'react'

const ROTATE_X_MAX = 4
const ROTATE_Y_MAX = 25
const LERP_FACTOR  = 0.14

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

    const updateTarget = (clientX: number, clientY: number) => {
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      targetY.current =  ((clientX - cx) / cx) * ROTATE_Y_MAX
      targetX.current = -((clientY - cy) / cy) * ROTATE_X_MAX
    }

    const onMouseMove = (e: MouseEvent) => updateTarget(e.clientX, e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) updateTarget(t.clientX, t.clientY)
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: true })

    const tick = () => {
      rotX.current = lerp(rotX.current, targetX.current, LERP_FACTOR)
      rotY.current = lerp(rotY.current, targetY.current, LERP_FACTOR)
      el.style.transform = `perspective(800px) rotateY(${rotY.current}deg) rotateX(${rotX.current}deg)`
      rafId.current = requestAnimationFrame(tick)
    }
    rafId.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove',  onTouchMove)
      cancelAnimationFrame(rafId.current)
    }
  }, [elementRef])
}
