'use client'

import { useEffect } from 'react'

// Intercepts all <a href="#..."> clicks and applies smooth scroll with header offset.
// Needed because CSS scroll-margin-top is unreliable on iOS Safari < 14.5,
// and CSS scroll-behavior: smooth has issues on iOS with fixed headers.
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
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return null
}

export function scrollToElement(el: HTMLElement) {
  const headerOffset = window.innerWidth >= 1024 ? 147 : 136
  const top = el.getBoundingClientRect().top + window.scrollY - headerOffset
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}
