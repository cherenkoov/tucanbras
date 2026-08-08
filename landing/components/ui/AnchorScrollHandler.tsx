'use client'

import { useEffect } from 'react'

// Intercepts all <a href="#..."> clicks before iOS Safari processes hash navigation.
// Uses capture phase so e.preventDefault() fires before the browser's anchor scroll.
// Uses scrollIntoView so the browser dynamically tracks element position (avoids
// layout-shift errors from getBoundingClientRect + window.scrollY pre-calculation).
// scroll-margin-top on each section provides the fixed-header offset.
export default function AnchorScrollHandler() {
  useEffect(() => {
    let scrolledRecently = false
    let scrollTimer: ReturnType<typeof setTimeout>

    const onScroll = () => {
      scrolledRecently = true
      clearTimeout(scrollTimer)
      // Ghost clicks on iOS fire within ~100ms after a scroll gesture ends
      scrollTimer = setTimeout(() => { scrolledRecently = false }, 150)
    }

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href === '#') return
      const el = document.querySelector(href)
      if (!el) return
      // Always prevent default browser anchor jump
      e.preventDefault()
      // Ignore ghost clicks that fire right after a scroll gesture on iOS
      if (scrolledRecently) return
      scrollToElement(el as HTMLElement)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('click', handleClick, { capture: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('click', handleClick, { capture: true })
      clearTimeout(scrollTimer)
    }
  }, [])

  return null
}

// ─── Scroll speed ────────────────────────────────────────────────────────────
// Adjust SCROLL_DURATION_MS to control scroll speed (milliseconds).
// Lower = faster, higher = slower. Typical range: 400–1200.
// Exported because the header pins its active pill for exactly this long while
// the tween runs — two copies of the number would drift apart.
export const SCROLL_DURATION_MS = 2800

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * How much of the top of the viewport the fixed header owns.
 *
 * Desktop hangs 17px lower than mobile — see the wrapper padding in page.tsx, which
 * is where the pair comes from (43/60px padding + 85/96px bar + 8px air). The same
 * two numbers are what every section's `scroll-mt-[136px] lg:scroll-mt-[164px]`
 * spells, and what useActiveSection's probe allows for; exported so the landing
 * carries ONE copy of them instead of three that drift apart.
 *
 * Call it at the moment you need it, never at module scope: it reads innerWidth.
 */
export function headerOffset(): number {
  return window.innerWidth >= 1024 ? 164 : 136
}

export function scrollToElement(el: HTMLElement) {
  const start  = window.scrollY
  const target = el.getBoundingClientRect().top + window.scrollY - headerOffset()
  const distance = target - start
  if (Math.abs(distance) < 1) return

  let startTime: number | null = null

  const step = (timestamp: number) => {
    if (startTime === null) startTime = timestamp
    const elapsed  = timestamp - startTime
    const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1)
    window.scrollTo({ top: start + distance * easeInOutCubic(progress), behavior: 'instant' })
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}
