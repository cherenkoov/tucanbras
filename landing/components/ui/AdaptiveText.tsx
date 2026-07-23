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
// grayscale → BINARY threshold at luminance 0.70 → map onto the ink↔cream axis,
// inverted so a DARK background yields CREAM text and a LIGHT one yields INK.
// The threshold is type="discrete": 20 bins, bins 0–13 (lum < 0.70) → 0, bins
// 14–19 (lum ≥ 0.70) → 1 — no transition band at all, every pixel resolves to
// pure ink or pure cream (the previous steep linear ramp, slope ×30 around
// 0.698, still let mid-luminance backgrounds through as gray letters).
//   ink #323031 = rgb(.196078 .188235 .192157) · cream #fffce5 = rgb(1 .988235 .898039)
const THRESHOLD_STEP = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1 1 1 1 1'
export function AdaptiveDuotoneFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="adaptive-duotone" colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues={THRESHOLD_STEP} />
          <feFuncG type="discrete" tableValues={THRESHOLD_STEP} />
          <feFuncB type="discrete" tableValues={THRESHOLD_STEP} />
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
  // Escape hatch: force this text to one duotone side in static mode (touch/reduced-
  // motion) when the layered fill can't resolve its spot. Desktop backdrop ignores it.
  staticFill?: 'ink' | 'cream'
}

// Text over the moving collage whose colour adapts to the background behind it
// (ink↔cream duotone). On desktop, single-line text reflects the LIVE background incl.
// moving sprites (backdrop-filter); multi-line text, mobile, and reduced-motion use the
// cheaper static-fill. The element renders as real text (layout/SEO/a11y) and the
// solid-ink fallback if neither technique can run. See useAdaptiveText for the logic.
export default function AdaptiveText({ as: Tag = 'p', className, style, children, staticFill }: AdaptiveTextProps) {
  const maskId = `adaptive-mask-${useId().replace(/:/g, '')}`
  const textRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLSpanElement>(null)
  const maskRef = useRef<SVGTextElement>(null)

  useAdaptiveText({ textRef, overlayRef, maskRef, maskId, staticFill })

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
          // Explicit longhands, NOT `inset:0`: the hook grows this box past the element to
          // stop iOS clipping the backdrop-filter at the glyph tops, and on real iOS Safari
          // an `inset` shorthand was winning over the hook's top/bottom override.
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, pointerEvents: 'none', display: 'none' }}
        />
      </Tag>
    </>
  )
}
