'use client'

import { useEffect, useRef } from 'react'

/**
 * The Hero's H1, which grows to fill the card once the card fills the page.
 *
 * Above the breakpoint the card is `w-fit`: the heading sets the card's width, and the
 * design's clamp is the whole story. Below it the card is `w-full` and the relationship
 * inverts — the page sets the width and the heading has to answer to it. The clamp has
 * bottomed out at 24px by then (3.75vw of 500 is 18.75), so the phone got a heading that
 * stopped responding exactly where the card started stretching, leaving the two lines
 * short of the card's right edge by a growing margin.
 *
 * So on the phone the size is MEASURED, not declared: the longest of the two lines is
 * made to span FILL of the card's width, whatever the locale's wording costs.
 *
 * Why it cannot be CSS. The size wanted here is `target ÷ (natural width of this exact
 * string in this exact font)`, and no length unit knows the second term. A `vw` tuned by
 * hand would have to be re-tuned per locale — the lines come from Notion, and Portuguese
 * runs a good deal longer than English.
 *
 * The measurement converges in one step because the card's width does NOT depend on the
 * font here: `w-full` is set by the page, so scaling the type cannot move the target the
 * way it would against `w-fit`. Text advance is linear in font-size, so one ratio lands
 * it; the second pass only cleans up rounding.
 */
export default function HeroHeading({
  line1,
  line2,
  className,
}: {
  line1: string
  line2: string
  className?: string
}) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    const card = el?.parentElement
    if (!el || !card) return

    const fit = () => {
      // Every pass starts from the design's own value, so widening back past the
      // breakpoint (rotation, resize) restores the clamp instead of freezing the
      // last phone-sized number in place.
      el.style.fontSize = HERO_H1_CLAMP
      el.style.whiteSpace = ''
      if (!window.matchMedia(FULL_BLEED).matches) return

      // Measured on one line. The class keeps a `max-[335px]:whitespace-normal` escape
      // for the no-JS case, and a wrapped line measures as the column it wrapped into,
      // which would read as "already full" and scale the type DOWN.
      el.style.whiteSpace = 'nowrap'

      const target = card.getBoundingClientRect().width * FILL
      for (let pass = 0; pass < 2; pass++) {
        const base = Number.parseFloat(getComputedStyle(el).fontSize)
        // Ranges, not the spans' own boxes: each line is a `block` as wide as the h1,
        // so its rect says nothing about where the letters end.
        let widest = 0
        for (const span of Array.from(el.children)) {
          const range = document.createRange()
          range.selectNodeContents(span)
          widest = Math.max(widest, range.getBoundingClientRect().width)
        }
        if (!(widest > 0) || !(base > 0)) return
        el.style.fontSize = `${(base * target) / widest}px`
      }
    }

    // Refit on WIDTH only. Sizing the type changes the h1's height, which the observer
    // would otherwise hand straight back as a reason to refit again.
    let lastWidth = -1
    const measure = () => {
      const w = card.getBoundingClientRect().width
      if (Math.abs(w - lastWidth) < 0.5) return
      lastWidth = w
      fit()
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(card)

    // Crossing the breakpoint the other way can leave the card the same width it already
    // had (a `w-fit` card at 501px and a `w-full` one at 500px are within a pixel), and
    // then the observer has nothing to report while the rule that governs has flipped.
    const mq = window.matchMedia(FULL_BLEED)
    const onFlip = () => { lastWidth = -1; measure() }
    mq.addEventListener('change', onFlip)

    // Web fonts change every advance width; the first fit runs on the fallback metrics.
    let cancelled = false
    document.fonts?.ready.then(() => { if (!cancelled) fit() }).catch(() => {})

    return () => {
      cancelled = true
      ro.disconnect()
      mq.removeEventListener('change', onFlip)
    }
  }, [line1, line2])

  return (
    <h1
      ref={ref}
      className={className}
      style={{ fontSize: HERO_H1_CLAMP, lineHeight: '1.125' }}
    >
      <span className="block">{line1}</span>
      <span className="block">{line2}</span>
    </h1>
  )
}

/** H3 in the design — Involve Medium 72px, down to 24px. The ceiling every refit restores. */
const HERO_H1_CLAMP = 'clamp(24px, 3.75vw, 72px)'

/**
 * Where the card stops being `w-fit` and fills the page. This is the SOURCE STRING of
 * `max-[500px]:` in Hero.tsx, not a paraphrase of it: Tailwind v4 compiles that variant
 * to `@media not (min-width: 500px)`, which is EXCLUSIVE — at exactly 500px the card is
 * still `w-fit`. A hand-written `(max-width: 500px)` matches there and does not, so the
 * fit engaged one pixel-width before the card stretched: measured at 500px it chased a
 * `w-fit` card that shrank with the type it was sizing, and settled at 86.5% instead of
 * 80%. Same string, same instant, no feedback.
 */
const FULL_BLEED = 'not (min-width: 500px)'

/** Share of the card's width the longest heading line spans below that breakpoint. */
const FILL = 0.8
