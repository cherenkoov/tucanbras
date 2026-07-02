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
const SVGNS = 'http://www.w3.org/2000/svg'

function supportsBackdrop(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'grayscale(1)') ||
      CSS.supports('-webkit-backdrop-filter', 'grayscale(1)'))
  )
}

// Measure the element's rendered lines so the glyph mask matches the browser's own
// wrapping at any width / line count. Walks every text-node child character by
// character (Range rects) — JSX like `&ldquo;{text}&rdquo;` renders as SEVERAL sibling
// text nodes, so stopping at the first would mask only the opening quote. Buckets chars
// by rounded top → one entry per visual line, each with its text + left-x +
// vertical-centre-y in the element's local px box.
function measureLines(el: HTMLElement): { text: string; x: number; y: number }[] {
  const textNodes = Array.from(el.childNodes).filter(
    (n): n is Text => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim(),
  )
  if (textNodes.length === 0) return []
  const elRect = el.getBoundingClientRect()
  const range = document.createRange()
  const buckets = new Map<number, { text: string; left: number; top: number; bottom: number }>()
  for (const textNode of textNodes) {
    const full = textNode.textContent ?? ''
    for (let i = 0; i < full.length; i++) {
      range.setStart(textNode, i)
      range.setEnd(textNode, i + 1)
      const r = range.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) continue // collapsed whitespace at a wrap
      const key = Math.round(r.top)
      let b = buckets.get(key)
      if (!b) { b = { text: '', left: Infinity, top: r.top, bottom: r.bottom }; buckets.set(key, b) }
      b.text += full[i]
      if (r.top < b.top) b.top = r.top
      if (r.bottom > b.bottom) b.bottom = r.bottom
      if (!/\s/.test(full[i]) && r.left < b.left) b.left = r.left // ignore spaces for the left edge
    }
  }
  return Array.from(buckets.values())
    .filter(b => b.left !== Infinity) // drop whitespace-only lines
    .sort((a, b) => a.top - b.top)
    .map(b => ({ text: b.text.trim(), x: b.left - elRect.left, y: (b.top + b.bottom) / 2 - elRect.top }))
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

    // backdrop works for any line count (multi-line mask below) and on touch devices;
    // only reduced-motion or missing backdrop-filter support fall back to static-fill.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canBackdrop = supportsBackdrop() && !reduced

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
    // The mask carries one <tspan> per RENDERED line (measureLines), so it matches the
    // element's own wrapping at any width / line count and honours its text-align.
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
      maskText.setAttribute('dominant-baseline', 'central')
      maskText.setAttribute('font-family', cs.fontFamily)
      maskText.setAttribute('font-size', cs.fontSize)
      maskText.setAttribute('font-weight', cs.fontWeight)
      maskText.setAttribute('font-style', cs.fontStyle)
      maskText.setAttribute('letter-spacing', cs.letterSpacing)

      while (maskText.firstChild) maskText.removeChild(maskText.firstChild)
      const lines = measureLines(text)
      if (lines.length === 0) {
        // No measurable text node (e.g. element children) → one centred line.
        maskText.setAttribute('text-anchor', 'middle')
        maskText.setAttribute('x', String(w / 2))
        maskText.setAttribute('y', String(h / 2))
        maskText.textContent = text.textContent
        return true
      }
      maskText.setAttribute('text-anchor', 'start')
      maskText.removeAttribute('x')
      maskText.removeAttribute('y')
      for (const ln of lines) {
        const tspan = document.createElementNS(SVGNS, 'tspan')
        tspan.setAttribute('x', String(ln.x))
        tspan.setAttribute('y', String(ln.y))
        tspan.textContent = ln.text
        maskText.appendChild(tspan)
      }
      return true
    }

    // Returns true once a mode has actually been applied (so polling can stop).
    const decide = (): boolean => (canBackdrop ? applyBackdrop() : applyStatic())

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
