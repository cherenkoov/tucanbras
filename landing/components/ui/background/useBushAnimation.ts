'use client'

import { useEffect, type RefObject } from 'react'
import { gsap } from 'gsap'

const SLIDE_OFFSET = 50
const SLIDE_DURATION = 3    // entrance slide-in speed in seconds (larger = slower)
const SCALE_TARGET = 1.01   // subtle +1% grow on entrance, kept as the sway resting state
// Play the entrance once the bush has scrolled up into the lower-middle of the viewport —
// not the moment it first peeks from the bottom. Triggered on the bush's REAL on-screen
// position via g.getBoundingClientRect(), NOT IntersectionObserver: each bush is its own
// full-canvas <svg viewBox="0 0 800 2047"> anchored at top:0, and IO has no reliable layout
// box for an inner SVG <g>, so it would fire on page load. getBoundingClientRect is reliable.
const TRIGGER_RATIO = 0.55  // fire when the bush's top edge rises above 55% of viewport height

// Sway (after entrance) — scroll-velocity driven, like the Big Tree. Pivot is the screen
// EDGE at the bush's vertical center: bush 1 → left edge, bush 2 → right edge.
const MAX_DEGREES = 4       // sway cap; edge pivot = long lever, so this is the main tuning knob
const SMOOTHING = 0.07      // how fast `current` eases toward `target`
const DECAY = 0.88          // how fast `target` relaxes back to upright
const VELOCITY_SENS = 0.15  // scroll-delta → target degrees
const IDLE_FRAMES = 20      // stop the RAF after this many settled frames

type BushEntry = {
  el: HTMLDivElement
  g: SVGGElement
  offset: number
  index: number
  played: boolean
  swaying: boolean
  target: number
  current: number
}

export function useBushAnimation(
  bush01Ref: RefObject<HTMLDivElement | null>,
  bush02Ref: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tweens: gsap.core.Tween[] = []
    let rafId: number | null = null
    let lastY = window.scrollY
    let idleCount = 0

    const sources: [RefObject<HTMLDivElement | null>, number][] = [
      [bush01Ref, SLIDE_OFFSET],
      [bush02Ref, -SLIDE_OFFSET],
    ]

    const entries: BushEntry[] = []
    sources.forEach(([ref, offset], index) => {
      const el = ref.current
      if (!el) return
      const g = el.querySelector<SVGGElement>('g')
      if (!g) return
      entries.push({ el, g, offset, index, played: false, swaying: false, target: 0, current: 0 })
    })

    if (entries.length === 0) return

    // Resting transform left by the entrance; the sway adds rotate() on top of it.
    const restingTransform = (entry: BushEntry) =>
      `translateX(${entry.offset}px) scale(${SCALE_TARGET})`

    const stopRAF = () => {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
    }

    const tick = () => {
      let active = false
      for (const entry of entries) {
        if (!entry.swaying) continue
        entry.target *= DECAY
        entry.current += (entry.target - entry.current) * SMOOTHING
        entry.el.style.transform = `${restingTransform(entry)} rotate(${entry.current.toFixed(3)}deg)`
        if (Math.abs(entry.target) >= 0.001 || Math.abs(entry.current) >= 0.001) active = true
      }
      if (active) {
        idleCount = 0
      } else if (++idleCount >= IDLE_FRAMES) {
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

    const play = (entry: BushEntry) => {
      entry.played = true
      // Pivot = container edge (x) at the bush's own vertical center. One origin for both
      // scale and rotate → no jump at the handoff. Percentages are of the bush's OWN
      // wrapper svg viewBox — the bounded bush box is deliberately EXTENDED to the canvas
      // edge on its pivot side (see BackgroundCanvas), so '0%'/'100%' of the box IS the
      // container edge, same long-lever sway as with the old full-canvas wrappers.
      const b = entry.g.getBBox()
      const vb = entry.el.querySelector('svg')?.viewBox.baseVal
      const centerY =
        b && vb && b.height > 0 && vb.height > 0
          ? `${(((b.y + b.height / 2 - vb.y) / vb.height) * 100).toFixed(2)}%`
          : '55%'
      const originX = entry.index === 0 ? '0%' : '100%' // bush 1 → left edge, bush 2 → right edge
      gsap.set(entry.el, { scale: 1, transformOrigin: `${originX} ${centerY}` })
      tweens.push(
        gsap.to(entry.el, {
          x: entry.offset,
          scale: SCALE_TARGET,
          duration: SLIDE_DURATION,
          ease: 'power1.inOut',
          delay: entry.index * 0.1,
          onComplete: () => { entry.swaying = true }, // hand off to the sway
        })
      )
    }

    const triggerEntrances = () => {
      const limit = window.innerHeight * TRIGGER_RATIO
      for (const entry of entries) {
        if (!entry.played && entry.g.getBoundingClientRect().top < limit) play(entry)
      }
    }

    // One scroll listener for both bushes: drives the entrance trigger AND the sway velocity.
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastY
      lastY = y
      triggerEntrances()
      let swaying = false
      for (const entry of entries) {
        if (!entry.swaying) continue
        entry.target = Math.max(-MAX_DEGREES, Math.min(MAX_DEGREES, -delta * VELOCITY_SENS))
        swaying = true
      }
      if (swaying) startRAF()
    }

    triggerEntrances() // fire immediately if a bush is already in view on mount
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      stopRAF()
      tweens.forEach(t => t.kill())
      for (const entry of entries) {
        entry.el.style.transform = ''
        entry.el.style.transformOrigin = ''
      }
    }
  }, [enabled, bush01Ref, bush02Ref])
}
