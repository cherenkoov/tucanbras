'use client'

import { useEffect, type RefObject } from 'react'
import {
  BEACH_SPINNERS,
  BEACH_VIEWBOX_W,
  BEACH_VIEWBOX_H,
  SPIN_SENS,
  SPIN_STIFFNESS,
  SPIN_DAMPING,
  SPIN_IDLE_FRAMES,
  SPIN_SETTLE_EPS,
} from './beachSpinners'
import { spinStep, isSettled, originPercent, type SpinState } from './beachSpinnerMath'

interface SpinnerEntry extends SpinState {
  el: HTMLElement
  dir: number
}

// Spins each palm/umbrella overlay around its own centre by scroll direction.
// The angle ACCUMULATES with scroll and HOLDS when idle; the spring integrator
// gives an ease-in/ease-out feel. Only the wrapper div is transformed (inner <g>
// transforms don't render under dangerouslySetInnerHTML — see useBushAnimation).
export function useBeachSpinnerAnimation(
  beachRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean },
): void {
  useEffect(() => {
    if (!enabled) return
    const root = beachRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dirById = new Map<string, number>(BEACH_SPINNERS.map((s) => [s.id, s.dir]))
    const entries: SpinnerEntry[] = []
    root.querySelectorAll<HTMLElement>('[data-spin-id]').forEach((el) => {
      const id = el.dataset.spinId
      if (!id) return
      const dir = dirById.get(id)
      if (dir === undefined) return
      const g = el.querySelector<SVGGElement>('g')
      const b = g ? g.getBBox() : null
      const o =
        b && b.width > 0
          ? originPercent(b, BEACH_VIEWBOX_W, BEACH_VIEWBOX_H)
          : { x: 50, y: 50 }
      el.style.transformOrigin = `${o.x.toFixed(3)}% ${o.y.toFixed(3)}%`
      entries.push({ el, dir, target: 0, current: 0, velocity: 0 })
    })
    if (entries.length === 0) return

    let rafId: number | null = null
    let idleCount = 0
    let lastY = window.scrollY
    let isNear = false

    const stopRAF = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    const tick = () => {
      let active = false
      for (const e of entries) {
        const angle = spinStep(e, SPIN_STIFFNESS, SPIN_DAMPING)
        e.el.style.transform = `rotate(${angle.toFixed(3)}deg)`
        if (!isSettled(e, SPIN_SETTLE_EPS)) active = true
      }
      if (active) {
        idleCount = 0
      } else if (++idleCount >= SPIN_IDLE_FRAMES) {
        stopRAF()
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    const startRAF = () => {
      if (rafId !== null) return
      idleCount = 0
      rafId = requestAnimationFrame(tick)
    }

    // lastY advances even while offscreen so re-entry doesn't apply a huge delta;
    // accumulation + RAF only run while the beach band is near the viewport.
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      if (!isNear || delta === 0) return
      for (const e of entries) e.target += delta * SPIN_SENS * e.dir
      startRAF()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isNear = entry.isIntersecting
        if (!isNear) stopRAF() // hold the current angle; just stop stepping
      },
      { threshold: 0, rootMargin: '300px 0px 300px 0px' },
    )
    observer.observe(root)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
      stopRAF()
      for (const e of entries) {
        e.el.style.transform = ''
        e.el.style.transformOrigin = ''
      }
    }
  }, [enabled, beachRef])
}
