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
const SCROLL_DURATION_MS = 1200

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export function scrollToElement(el: HTMLElement) {
  const headerOffset = window.innerWidth >= 1024 ? 147 : 136
  const start  = window.scrollY
  const target = el.getBoundingClientRect().top + window.scrollY - headerOffset
  const distance = target - start
  if (Math.abs(distance) < 1) return

  let startTime: number | null = null

  const step = (timestamp: number) => {
    if (startTime === null) startTime = timestamp
    const elapsed  = timestamp - startTime
    const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1)
    window.scrollTo(0, start + distance * easeInOutCubic(progress))
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}
