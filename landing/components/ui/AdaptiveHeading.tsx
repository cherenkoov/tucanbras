'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useAdaptiveHeadingBackdrop } from './useAdaptiveHeadingBackdrop'

const MASK_ID = 'adaptive-heading-mask'

// Duotone filter applied to the live backdrop: grayscale → tighten contrast around a
// midpoint (soft threshold) → map onto the ink↔cream axis, inverted so a DARK backdrop
// yields CREAM text and a LIGHT backdrop yields INK text. Tuned on /blend-demo:
//   ramp ×12 → contrast slope 12 · midpoint 0.74 → intercept 0.5 − 12·0.74 = −8.38
//   ink #323031 = rgb(.196078 .188235 .192157) · cream #fffce5 = rgb(1 .988235 .898039)
function AdaptiveDuotoneFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="adaptive-duotone" colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope={12} intercept={-8.38} />
          <feFuncG type="linear" slope={12} intercept={-8.38} />
          <feFuncB type="linear" slope={12} intercept={-8.38} />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="1 0.196078" />
          <feFuncG type="table" tableValues="0.988235 0.188235" />
          <feFuncB type="table" tableValues="0.898039 0.192157" />
        </feComponentTransfer>
      </filter>
    </svg>
  )
}

interface AdaptiveHeadingProps {
  className?: string
  style?: CSSProperties
  children: ReactNode
}

// A heading whose colour adapts to the LIVE moving background behind it. The glyphs
// reveal a duotone (ink↔cream) of the real composited backdrop via backdrop-filter, so
// scroll AND the animated sprites are reflected automatically. The real <h2> holds
// layout + SEO/a11y and is the readable solid-ink fallback when backdrop-filter is
// unsupported. The glyph shapes come from a mask built from the heading's own text.
export default function AdaptiveHeading({ className, style, children }: AdaptiveHeadingProps) {
  const h2Ref = useRef<HTMLHeadingElement>(null)
  const overlayRef = useRef<HTMLSpanElement>(null)
  const maskTextRef = useRef<SVGTextElement>(null)

  useAdaptiveHeadingBackdrop({ h2Ref, overlayRef, maskTextRef, maskId: MASK_ID })

  return (
    <span style={{ position: 'relative', display: 'block', width: '100%' }}>
      <AdaptiveDuotoneFilter />

      {/* Glyph mask: the heading's own text, in the page font (Involve), sized to the
          rendered <h2> by the hook — so the masked overlay matches the heading exactly. */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <mask id={MASK_ID} maskContentUnits="userSpaceOnUse">
          <text ref={maskTextRef} fill="#fff" textAnchor="middle" dominantBaseline="central" />
        </mask>
      </svg>

      {/* Real heading text — layout + SEO/a11y, and the solid-ink fallback. */}
      <h2 ref={h2Ref} className={className} style={{ ...style, color: 'var(--color-ink)' }}>
        {children}
      </h2>

      {/* Overlay: live duotone of the backdrop, clipped to the glyphs by the mask. */}
      <span
        ref={overlayRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </span>
  )
}
