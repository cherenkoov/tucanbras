'use client'

import { useEffect, type RefObject } from 'react'

// Live duotone via backdrop-filter: the compositor samples the actual rendered
// background behind the heading every frame — so it reflects the moving sprites
// (train, clouds, people, waves) and scroll automatically, with no JS tracking. We
// only (re)build the glyph mask when the heading box/text changes (mount + resize).
const BACKDROP = 'grayscale(1) url(#adaptive-duotone)'

function supportsBackdrop(): boolean {
  return (
    typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'grayscale(1)') ||
      CSS.supports('-webkit-backdrop-filter', 'grayscale(1)'))
  )
}

export function useAdaptiveHeadingBackdrop({
  h2Ref,
  overlayRef,
  maskTextRef,
  maskId,
}: {
  h2Ref: RefObject<HTMLHeadingElement | null>
  overlayRef: RefObject<HTMLSpanElement | null>
  maskTextRef: RefObject<SVGTextElement | null>
  maskId: string
}): void {
  useEffect(() => {
    const h2 = h2Ref.current
    const overlay = overlayRef.current
    const maskText = maskTextRef.current
    if (!h2 || !overlay || !maskText) return
    // No backdrop-filter support → keep the solid-ink fallback rendered by the component.
    if (!supportsBackdrop()) return

    let enhanced = false
    const enhance = () => {
      if (enhanced) return
      enhanced = true
      overlay.style.setProperty('backdrop-filter', BACKDROP)
      overlay.style.setProperty('-webkit-backdrop-filter', BACKDROP)
      overlay.style.setProperty('mask', `url(#${maskId})`)
      overlay.style.setProperty('-webkit-mask', `url(#${maskId})`)
      h2.style.color = 'transparent' // hide the ink fallback; the overlay shows the glyphs
    }
    const unenhance = () => {
      enhanced = false
      overlay.style.removeProperty('backdrop-filter')
      overlay.style.removeProperty('-webkit-backdrop-filter')
      overlay.style.removeProperty('mask')
      overlay.style.removeProperty('-webkit-mask')
      h2.style.color = ''
    }

    // Rebuild the glyph mask to match the rendered <h2> (its box, text, and font). The
    // mask's user space is the masked element's px box, so we centre the text at w/2,h/2.
    // NOTE: single line — a multi-line heading would need per-line <tspan>s (TODO).
    const sync = () => {
      const w = h2.clientWidth
      const h = h2.clientHeight
      if (w === 0 || h === 0) return
      const cs = getComputedStyle(h2)
      maskText.textContent = h2.textContent
      maskText.setAttribute('x', String(w / 2))
      maskText.setAttribute('y', String(h / 2))
      maskText.setAttribute('font-family', cs.fontFamily)
      maskText.setAttribute('font-size', cs.fontSize)
      maskText.setAttribute('font-weight', cs.fontWeight)
      maskText.setAttribute('font-style', cs.fontStyle)
      maskText.setAttribute('letter-spacing', cs.letterSpacing)
      enhance()
    }

    sync()
    const ro = new ResizeObserver(() => sync())
    ro.observe(h2)

    return () => {
      ro.disconnect()
      unenhance()
    }
  }, [h2Ref, overlayRef, maskTextRef, maskId])
}
