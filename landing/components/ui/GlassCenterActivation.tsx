'use client'

import { useEffect } from 'react'

/**
 * Mobile "hover on scroll" for glass surfaces.
 *
 * Touch devices have no :hover, so the frosted→solid glass effect would never
 * fire. Instead, every element marked `data-glass-center` gets the `.is-center`
 * class while its vertical midpoint sits inside the middle third of the
 * viewport — the activation band (viewport split 1:1:1, centre rectangle is the
 * trigger zone). CSS maps `.is-center` onto the same visual as `:hover`.
 *
 * Desktop (hover-capable) devices keep native :hover and this does nothing.
 * One scroll listener, RAF-batched, DOM toggled directly (no React state).
 */
export default function GlassCenterActivation() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Touch / no-hover only — desktop keeps real :hover.
    if (!window.matchMedia('(hover: none)').matches) return
    // Reduced motion: leave surfaces in their static frosted state.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const els = Array.from(
      document.querySelectorAll<HTMLElement>('[data-glass-center]'),
    )
    if (els.length === 0) return

    const ACTIVE = 'is-center'
    let raf = 0

    const check = () => {
      raf = 0
      const vh = window.innerHeight || document.documentElement.clientHeight
      const bandTop = vh / 3
      const bandBottom = (vh * 2) / 3
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        // Skip hidden surfaces (e.g. desktop-only cards on a touch tablet) AND
        // giant ones (the About frame is ~2700px tall): repainting a card that
        // big costs a viewport-multiple IOSurface on iOS — toggling several of
        // them while scrolling About starved the compositor (paint void /
        // jetsam crash), and a mostly-off-screen surface going solid isn't a
        // readable effect anyway.
        const active =
          rect.height > 0 &&
          rect.height <= vh * 1.2 &&
          rect.top + rect.height / 2 >= bandTop &&
          rect.top + rect.height / 2 <= bandBottom
        if (active !== el.classList.contains(ACTIVE)) {
          el.classList.toggle(ACTIVE, active)
        }
      }
    }

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check)
    }

    check() // initial state for above-the-fold surfaces
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
      els.forEach(el => el.classList.remove(ACTIVE))
    }
  }, [])

  return null
}
