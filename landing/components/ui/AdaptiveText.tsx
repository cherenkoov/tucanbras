'use client'

import {
  useId,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react'
import { useAdaptiveText } from './useAdaptiveText'

// Shared duotone filter applied to the adaptive text (backdrop or static-fill):
// grayscale → HARD threshold around the midpoint (steep ramp, minimal gray midband) →
// map onto the ink↔cream axis, inverted so a DARK background yields CREAM text and a
// LIGHT one yields INK. Midpoint ~0.70 (intercept = −slope × 0.698); slope ×30 keeps
// the transition band tiny so pixels resolve to near-pure ink or cream.
//   ink #323031 = rgb(.196078 .188235 .192157) · cream #fffce5 = rgb(1 .988235 .898039)
export function AdaptiveDuotoneFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="adaptive-duotone" colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="linear" slope={30} intercept={-20.95} />
          <feFuncG type="linear" slope={30} intercept={-20.95} />
          <feFuncB type="linear" slope={30} intercept={-20.95} />
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

interface AdaptiveTextProps {
  as?: ElementType
  className?: string
  style?: CSSProperties
  children: ReactNode
}

// Text over the moving collage whose colour adapts to the background behind it
// (ink↔cream duotone). On desktop, single-line text reflects the LIVE background incl.
// moving sprites (backdrop-filter); multi-line text, mobile, and reduced-motion use the
// cheaper static-fill. The element renders as real text (layout/SEO/a11y) and the
// solid-ink fallback if neither technique can run. See useAdaptiveText for the logic.
export default function AdaptiveText({ as: Tag = 'p', className, style, children }: AdaptiveTextProps) {
  const maskId = `adaptive-mask-${useId().replace(/:/g, '')}`
  const textRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLSpanElement>(null)
  const maskRef = useRef<SVGTextElement>(null)

  useAdaptiveText({ textRef, overlayRef, maskRef, maskId })

  return (
    <>
      <AdaptiveDuotoneFilter />

      {/* Per-instance glyph mask (single-line backdrop mode). Text/box/font set by the
          hook so it matches the rendered element; uses the page font (inline SVG). */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <mask id={maskId} maskContentUnits="userSpaceOnUse">
          <text ref={maskRef} fill="#fff" textAnchor="middle" dominantBaseline="central" />
        </mask>
      </svg>

      <Tag
        ref={textRef as Ref<HTMLElement>}
        className={className}
        style={{ ...style, position: 'relative', color: 'var(--color-ink)' }}
      >
        {children}
        {/* Overlay for backdrop mode (hidden in static mode); covers the text box. */}
        <span
          ref={overlayRef}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'none' }}
        />
      </Tag>
    </>
  )
}
