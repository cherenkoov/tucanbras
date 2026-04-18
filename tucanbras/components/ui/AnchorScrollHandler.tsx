'use client'

import { useEffect } from 'react'

// Intercepts all <a href="#..."> clicks before iOS Safari processes hash navigation.
// Uses capture phase so e.preventDefault() fires before the browser's anchor scroll.
// Uses scrollIntoView so the browser dynamically tracks element position (avoids
// layout-shift errors from getBoundingClientRect + window.scrollY pre-calculation).
// scroll-margin-top on each section provides the fixed-header offset.
export default function AnchorScrollHandler() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href^="#"]')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href === '#') return
      const el = document.querySelector(href)
      if (!el) return
      e.preventDefault()
      scrollToElement(el as HTMLElement)
    }
    // capture:true — fires before iOS Safari processes the anchor navigation
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])

  return null
}

export function scrollToElement(el: HTMLElement) {
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
