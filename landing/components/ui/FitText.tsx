'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

interface FitTextProps {
  className?: string
  style?: CSSProperties
  /** Lower bound (px) the font may shrink to before we fall back to word-breaking. */
  minFontSize?: number
  children: ReactNode
}

// Renders a title that treats its CSS font-size (a clamp()) as a ceiling and shrinks the
// font DOWN — never mid-word — when the longest word would otherwise overflow its column.
// Used for the Comparison block titles: a long localized title sits in a narrow flex lane
// next to the pacing mascot, where plain wrapping would break a word ("ОБЫЧН|ЫЕ").
//
// It is fully reversible: every refit first restores the clamp ceiling, so when the column
// widens again (rotation, resize) the font grows straight back up to its design size.
//
// The measurement is stable because the title's column width is pinned by the flex layout
// (the mascot lane's minWidth + gap), independent of the font size — so shrinking only
// reduces the widest word until it fits, and the loop converges.
export default function FitText({ className, style, minFontSize = 16, children }: FitTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)
  // The responsive ceiling comes from the caller's inline font-size (a clamp()); capture it
  // so each refit can restore it rather than wiping font-size down to the inherited value.
  const ceiling = typeof style?.fontSize === 'string' ? style.fontSize : ''

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const parent = el.parentElement

    const fit = () => {
      // Measure with natural (non-breaking) wrapping so an oversized word actually overflows.
      el.style.overflowWrap = 'normal'
      el.style.fontSize = ceiling // restore the responsive ceiling (lets the font grow back)
      let size = parseFloat(getComputedStyle(el).fontSize)
      while (size > minFontSize && el.scrollWidth > el.clientWidth) {
        size -= 1
        el.style.fontSize = `${size}px`
      }
      // Only when we bottomed out and it still overflows do we allow the word to break;
      // otherwise clear the override so the className's default governs.
      el.style.overflowWrap = el.scrollWidth > el.clientWidth ? 'break-word' : ''
    }

    // Refit only when the available WIDTH changes (font-driven height changes are ignored,
    // so mutating the font inside fit() can't retrigger the observer into a loop).
    let lastWidth = -1
    const measure = () => {
      const w = parent ? parent.clientWidth : el.clientWidth
      if (w === lastWidth) return
      lastWidth = w
      fit()
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(parent ?? el)

    // Web fonts change glyph metrics; refit once they're ready.
    let cancelled = false
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => { if (!cancelled) fit() }).catch(() => {})
    }

    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [minFontSize, ceiling, children])

  return (
    <p ref={ref} className={className} style={style}>
      {children}
    </p>
  )
}
