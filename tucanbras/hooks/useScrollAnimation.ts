import { useEffect, type RefObject } from 'react'

interface UseScrollAnimationOptions {
  ref:                  RefObject<HTMLElement | null>
  maxDegrees:           number
  decay:                number
  velocitySensitivity:  number
  // Called once at mount with the validated container element.
  // Must return the per-frame tick callback.
  // All mutable animation state (currentAngles, element refs) should
  // live inside this closure — the hook never touches them.
  setup: (el: HTMLElement) => (target: number) => void
}

// Frames near-zero before RAF is considered idle and cancelled.
const IDLE_FRAMES = 20

export function useScrollAnimation({
  ref,
  maxDegrees,
  decay,
  velocitySensitivity,
  setup,
}: UseScrollAnimationOptions): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const onTick = setup(el)

    let target    = 0
    let lastY     = window.scrollY
    let rafId:    number | null = null
    let idleCount = 0

    const stopRAF = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    }

    const tick = () => {
      target *= decay
      onTick(target)
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
      target = Math.max(-maxDegrees, Math.min(maxDegrees, -delta * velocitySensitivity))
      startRAF()
    }

    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) { stopRAF(); target = 0 } },
      { threshold: 0 },
    )

    observer.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      stopRAF()
      observer.disconnect()
    }
  // `setup` is intentionally omitted: it runs once at mount and owns all
  // mutable state. Adding it to deps would reset state on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDegrees, decay, velocitySensitivity])
}
