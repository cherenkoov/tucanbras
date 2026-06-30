'use client'

import { useEffect, type RefObject } from 'react'

// Adaptive duotone text over the moving background. Two proven techniques, chosen per
// device/line-count:
//  • backdrop-filter (desktop, single line): the compositor samples the LIVE backdrop
//    each frame → reflects the moving sprites; glyphs cut out by an SVG <text> mask.
//    Content-agnostic — correct over any background region.
//  • static-fill (mobile / reduced-motion / multi-line / no backdrop support):
//    background-clip:text fills the glyphs with the slice of the background art behind
//    them (handles any number of lines), kept aligned to that art's on-screen box.
// Both run the result through the shared #adaptive-duotone filter (ink↔cream).
//
// The background is layered: the collage (top) and the beach (below). Static-fill picks
// whichever art SVG is vertically behind the text; if neither is (plain page), it leaves
// the solid-ink fallback.
// `bg` is the solid ground painted UNDER the fill image (clipped to the glyphs too), so
// the fill matches the rendered background where the art is transparent. The beach uses
// a backdrop-stripped copy (main2-fill.svg) over the brown ground that BackgroundCanvas
// re-paints as its own z8 layer; the collage art is opaque so it needs no ground.
const SOURCES = [
  { viewBox: '0 0 800 2047', src: '/SVG/background/background-collage.svg', bg: 'transparent' },
  { viewBox: '0 0 1027 3614', src: '/SVG/background/main2-fill.svg', bg: '#77533E' },
] as const

const BACKDROP = 'grayscale(1) url(#adaptive-duotone)'
const FIND_TIMEOUT_FRAMES = 300

function supportsBackdrop(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'grayscale(1)') ||
      CSS.supports('-webkit-backdrop-filter', 'grayscale(1)'))
  )
}

export function useAdaptiveText({
  textRef,
  overlayRef,
  maskRef,
  maskId,
}: {
  textRef: RefObject<HTMLElement | null>
  overlayRef: RefObject<HTMLSpanElement | null>
  maskRef: RefObject<SVGTextElement | null>
  maskId: string
}): void {
  useEffect(() => {
    const text = textRef.current
    const overlay = overlayRef.current
    const maskText = maskRef.current
    if (!text || !overlay || !maskText) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches
    const canBackdrop = supportsBackdrop() && !reduced && !coarse

    let mode: 'none' | 'static' | 'backdrop' = 'none'

    const clearAll = () => {
      text.style.backgroundImage = ''
      text.style.backgroundColor = ''
      text.style.backgroundRepeat = ''
      text.style.backgroundSize = ''
      text.style.backgroundPosition = ''
      text.style.removeProperty('-webkit-background-clip')
      text.style.removeProperty('background-clip')
      text.style.filter = ''
      overlay.style.removeProperty('backdrop-filter')
      overlay.style.removeProperty('-webkit-backdrop-filter')
      overlay.style.removeProperty('mask')
      overlay.style.removeProperty('-webkit-mask')
      overlay.style.display = 'none'
      text.style.color = ''
    }

    // Which background art SVG is vertically behind the text's centre (collage / beach)?
    const pickSource = (): { src: string; bg: string; rect: DOMRect } | null => {
      const hr = text.getBoundingClientRect()
      const cy = hr.top + hr.height / 2
      for (const s of SOURCES) {
        const el = document.querySelector<SVGSVGElement>(`svg[viewBox="${s.viewBox}"]`)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && cy >= rect.top && cy <= rect.bottom) return { src: s.src, bg: s.bg, rect }
      }
      return null
    }

    // STATIC: fill glyphs with the slice of the art behind them; keep it aligned. Returns
    // false until an art source is behind the text (otherwise: solid-ink fallback).
    let lastSrc = ''
    let lastBg = ''
    const applyStatic = (): boolean => {
      const pick = pickSource()
      if (!pick) return false
      if (mode !== 'static') {
        clearAll()
        text.style.backgroundRepeat = 'no-repeat'
        text.style.setProperty('-webkit-background-clip', 'text')
        text.style.setProperty('background-clip', 'text')
        text.style.filter = 'url(#adaptive-duotone)'
        text.style.color = 'transparent'
        mode = 'static'
        lastSrc = ''
        lastBg = ''
      }
      if (pick.src !== lastSrc) {
        lastSrc = pick.src
        text.style.backgroundColor = pick.bg
        text.style.backgroundImage = `url("${pick.src}")`
      }
      const hr = text.getBoundingClientRect()
      const { rect: cr } = pick
      const key = `${cr.width}|${cr.height}|${cr.left - hr.left}|${cr.top - hr.top}`
      if (key !== lastBg) {
        lastBg = key
        text.style.backgroundSize = `${cr.width}px ${cr.height}px`
        text.style.backgroundPosition = `${cr.left - hr.left}px ${cr.top - hr.top}px`
      }
      return true
    }

    // BACKDROP: overlay shows the live duotone of the backdrop, masked to the glyphs.
    // Single line only — the mask is one <text> matched to the element's font + align.
    const applyBackdrop = (): boolean => {
      const w = text.clientWidth
      const h = text.clientHeight
      if (w === 0 || h === 0) return false
      if (mode !== 'backdrop') {
        clearAll()
        overlay.style.display = ''
        overlay.style.setProperty('backdrop-filter', BACKDROP)
        overlay.style.setProperty('-webkit-backdrop-filter', BACKDROP)
        overlay.style.setProperty('mask', `url(#${maskId})`)
        overlay.style.setProperty('-webkit-mask', `url(#${maskId})`)
        text.style.color = 'transparent'
        mode = 'backdrop'
      }
      const cs = getComputedStyle(text)
      const ta = cs.textAlign
      let x = w / 2
      let anchor = 'middle'
      if (ta === 'right' || ta === 'end') { x = w; anchor = 'end' }
      else if (ta === 'left' || ta === 'start') { x = 0; anchor = 'start' }
      maskText.textContent = text.textContent
      maskText.setAttribute('x', String(x))
      maskText.setAttribute('y', String(h / 2))
      maskText.setAttribute('text-anchor', anchor)
      maskText.setAttribute('font-family', cs.fontFamily)
      maskText.setAttribute('font-size', cs.fontSize)
      maskText.setAttribute('font-weight', cs.fontWeight)
      maskText.setAttribute('font-style', cs.fontStyle)
      maskText.setAttribute('letter-spacing', cs.letterSpacing)
      return true
    }

    const isSingleLine = (): boolean => {
      const cs = getComputedStyle(text)
      let lh = parseFloat(cs.lineHeight)
      if (!Number.isFinite(lh)) lh = parseFloat(cs.fontSize) * 1.2
      return text.clientHeight <= lh * 1.5
    }

    // Returns true once a mode has actually been applied (so polling can stop).
    const decide = (): boolean =>
      canBackdrop && isSingleLine() ? applyBackdrop() : applyStatic()

    let cancelled = false
    let rafId: number | null = null
    let near = true
    let ro: ResizeObserver | null = null
    let io: IntersectionObserver | null = null
    const onScroll = () => {
      // Static mode re-aligns / may switch source on scroll; backdrop auto-updates.
      if (near && rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          if (mode === 'static') applyStatic()
        })
      }
    }

    const attach = () => {
      ro = new ResizeObserver(() => decide())
      ro.observe(document.documentElement)
      ro.observe(text)
      io = new IntersectionObserver(
        ([e]) => { near = e.isIntersecting; if (near && mode === 'static') applyStatic() },
        { threshold: 0, rootMargin: '300px 0px' },
      )
      io.observe(text)
      window.addEventListener('scroll', onScroll, { passive: true })
    }

    // Apply as soon as possible. Backdrop needs no art source; static waits for one.
    let frames = 0
    const boot = () => {
      if (cancelled) return
      if (decide()) attach()
      else if (++frames < FIND_TIMEOUT_FRAMES) requestAnimationFrame(boot)
      // else: give up — element keeps its solid-ink fallback.
    }
    boot()

    return () => {
      cancelled = true
      window.removeEventListener('scroll', onScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      io?.disconnect()
      ro?.disconnect()
      clearAll()
    }
  }, [textRef, overlayRef, maskRef, maskId])
}
