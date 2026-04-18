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

export function scrollToElement(el: HTMLElement) {
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
