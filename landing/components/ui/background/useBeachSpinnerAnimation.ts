'use client'

import { useEffect, type RefObject } from 'react'
import {
  BEACH_SPINNERS,
  SPIN_DEG_PER_PX,
  SPIN_EASE,
  SPIN_IDLE_FRAMES,
  SPIN_MARGIN_PX,
  SPIN_SETTLE_EPS,
} from './beachSpinners'
import { addScroll, centreOrigin, easeToTarget, isOnScreen, isSettled, type SpinState } from './beachSpinnerMath'

interface Spinner extends SpinState {
  /** the full-canvas overlay div — this is what gets rotated */
  el: HTMLElement
  /** the art inside it; its live client rect says where the object really is on screen */
  art: SVGGElement | null
  dir: 1 | -1
}

/**
 * Spins every palm and umbrella of the beach scene as the page scrolls.
 *
 * Each object turns about its own centre and stays where it was painted. Half of them turn
 * clockwise on the way down and the other half counter-clockwise; scrolling back up reverses
 * both. The angle accumulates with the scroll and holds where it stops.
 *
 * Two things here look redundant and are not — both are scars:
 *
 *  1. The gate MEASURES the art (getBoundingClientRect on the inner <g>) instead of deriving
 *     its position from the SVG coordinates. The beach viewBox is rewritten at runtime by the
 *     surf injection, so any arithmetic anchored to a viewBox constant drifts — that is what
 *     kept the umbrellas from ever turning on screen.
 *
 *  2. The <g> is re-grabbed whenever the one we hold is no longer in the document. React
 *     re-injects the overlays' dangerouslySetInnerHTML during load: the wrapper div survives
 *     (its inline style sticks), but the <g> inside is replaced. A detached node measures
 *     0×0 at 0,0, which reads as "off screen" for everything and freezes the whole scene.
 */
export function useBeachSpinnerAnimation(
  beachRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean },
): void {
  useEffect(() => {
    if (!enabled) return
    const root = beachRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const dirById = new Map(BEACH_SPINNERS.map((s) => [s.id, s.dir]))
    const spinners: Spinner[] = []
    root.querySelectorAll<HTMLElement>('[data-spin-id]').forEach((el) => {
      const dir = el.dataset.spinId ? dirById.get(el.dataset.spinId) : undefined
      if (!dir) return
      spinners.push({ el, art: null, dir, target: 0, current: 0 })
    })
    if (spinners.length === 0) return

    // Re-grab the art if it went away (see 2. above) and re-pin the axis to its centre.
    const artOf = (s: Spinner): SVGGElement | null => {
      if (s.art?.isConnected) return s.art
      s.art = s.el.querySelector<SVGGElement>('g')
      const svg = s.el.querySelector('svg')
      const box = s.art?.getBBox()
      const view = svg?.viewBox.baseVal
      if (box && view && box.width > 0 && view.width > 0) {
        const o = centreOrigin(box, view)
        s.el.style.transformOrigin = `${o.x.toFixed(3)}% ${o.y.toFixed(3)}%`
      }
      return s.art
    }
    spinners.forEach(artOf)

    let rafId: number | null = null
    let idleFrames = 0
    let lastY = window.scrollY
    let beachNear = false

    const stop = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = null
    }

    const frame = () => {
      let moving = false
      for (const s of spinners) {
        s.el.style.transform = `rotate(${easeToTarget(s, SPIN_EASE).toFixed(3)}deg)`
        if (!isSettled(s, SPIN_SETTLE_EPS)) moving = true
      }
      if (moving) idleFrames = 0
      else if (++idleFrames >= SPIN_IDLE_FRAMES) return stop()
      rafId = requestAnimationFrame(frame)
    }

    const start = () => {
      if (rafId !== null) return
      idleFrames = 0
      rafId = requestAnimationFrame(frame)
    }

    // lastY keeps tracking while the scene is away, so coming back never applies a huge
    // delta at once. The observer is just a cheap early-out; the per-object gate below is
    // what makes an object start from 0° at the moment it appears.
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      if (!beachNear || delta === 0) return

      const viewportH = window.innerHeight
      let turned = false
      for (const s of spinners) {
        const art = artOf(s)
        if (art && !isOnScreen(art.getBoundingClientRect(), viewportH, SPIN_MARGIN_PX)) continue
        addScroll(s, delta, SPIN_DEG_PER_PX, s.dir)
        turned = true
      }
      if (turned) start()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        beachNear = entry.isIntersecting
        if (!beachNear) stop() // hold the angle; just stop stepping
      },
      { threshold: 0, rootMargin: '300px 0px 300px 0px' },
    )
    observer.observe(root)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
      stop()
      for (const s of spinners) {
        s.el.style.transform = ''
        s.el.style.transformOrigin = ''
      }
    }
  }, [enabled, beachRef])
}
