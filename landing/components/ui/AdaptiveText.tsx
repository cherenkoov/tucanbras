'use client'

import {
  useId,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
} from 'react'
import { useAdaptiveText, GREEN, LIGHT_GREEN, BLUE, INK, CREAM } from './useAdaptiveText'

// Shared duotone filter applied to the adaptive text (backdrop or static-fill):
// grayscale → BINARY threshold at luminance 0.70 → map onto the palette's two-colour
// axis, inverted so a DARK background yields the LIGHT colour and a LIGHT one the DARK.
// The threshold is type="discrete": 20 bins, bins 0–13 (lum < 0.70) → 0, bins
// 14–19 (lum ≥ 0.70) → 1 — no transition band at all, every pixel resolves to one
// pure side or the other (the previous steep linear ramp, slope ×30 around
// 0.698, still let mid-luminance backgrounds through as gray letters).
const THRESHOLD_STEP = '0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1 1 1 1 1'

// The duotone palettes. `dark` is what a DARK background resolves to, `light` what a
// LIGHT one does (the tableValues order the filter reads). BLUE is the default and runs
// green↔blue — the whole adaptive system is brand-coloured, no ink and no cream in it.
// Its light side is --color-blue, which reads best of the three over the collage's pale
// stretches (5.49:1 against cream, vs green-dark's 3.53:1 and brand green's 1.75:1).
//   blue        #2e67b2 = rgb(.180392 .403922 .698039)   ← light background
//   green       #8fd096 = rgb(.560784 .815686 .588235)   ← dark background
// `green` is the previous default, green↔green (light side --color-green-DARK, not the
// brand green — that one is only 1.75:1 over cream), kept as the second brand pair.
//   green-dark  #6a906e = rgb(.415686 .564706 .431373)   ← light background
// `ink` is the legacy near-black/cream pair, kept as an escape hatch — nothing uses it.
export const DUOTONES = {
  ink: {
    id: 'adaptive-duotone',
    dark:  ['1', '0.988235', '0.898039'],        darkColor:  CREAM,
    light: ['0.196078', '0.188235', '0.192157'], lightColor: INK,
    cssVar: '--color-ink',
  },
  green: {
    id: 'adaptive-duotone-green',
    dark:  ['0.560784', '0.815686', '0.588235'], darkColor:  LIGHT_GREEN,
    light: ['0.415686', '0.564706', '0.431373'], lightColor: GREEN,
    cssVar: '--color-green-dark',
  },
  blue: {
    id: 'adaptive-duotone-blue',
    dark:  ['0.560784', '0.815686', '0.588235'], darkColor:  LIGHT_GREEN,
    light: ['0.180392', '0.403922', '0.698039'], lightColor: BLUE,
    cssVar: '--color-blue',
  },
} as const
export type Duotone = keyof typeof DUOTONES

export const DEFAULT_DUOTONE: Duotone = 'blue'

export function AdaptiveDuotoneFilter({ duotone = DEFAULT_DUOTONE }: { duotone?: Duotone }) {
  const { id, dark, light } = DUOTONES[duotone]
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id={id} colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues={THRESHOLD_STEP} />
          <feFuncG type="discrete" tableValues={THRESHOLD_STEP} />
          <feFuncB type="discrete" tableValues={THRESHOLD_STEP} />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="table" tableValues={`${dark[0]} ${light[0]}`} />
          <feFuncG type="table" tableValues={`${dark[1]} ${light[1]}`} />
          <feFuncB type="table" tableValues={`${dark[2]} ${light[2]}`} />
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
  // The names are historical: 'ink' = the active palette's LIGHT-background side (green-
  // dark by default), 'cream' = its DARK-background side (light green by default).
  staticFill?: 'ink' | 'cream'
  // Which palette to run. Default green↔green; 'ink' is the legacy near-black/cream pair.
  duotone?: Duotone
}

// Text over the moving collage whose colour adapts to the background behind it (by default
// green-dark over light, light green over dark). On desktop, single-line text reflects the
// LIVE background incl. moving sprites (backdrop-filter); multi-line text, mobile, and
// reduced-motion use the cheaper static-fill. The element renders as real text
// (layout/SEO/a11y) and a solid fallback if neither technique can run. See useAdaptiveText.
export default function AdaptiveText({ as: Tag = 'p', className, style, children, staticFill, duotone = DEFAULT_DUOTONE }: AdaptiveTextProps) {
  const maskId = `adaptive-mask-${useId().replace(/:/g, '')}`
  const textRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLSpanElement>(null)
  const maskRef = useRef<SVGTextElement>(null)

  useAdaptiveText({
    textRef, overlayRef, maskRef, maskId, staticFill,
    filterId:   DUOTONES[duotone].id,
    lightColor: DUOTONES[duotone].lightColor,
    darkColor:  DUOTONES[duotone].darkColor,
  })

  return (
    <>
      <AdaptiveDuotoneFilter duotone={duotone} />

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
        // Base colour = this palette's LIGHT side, which is also what the effect
        // resolves to over the cream plate — so the pre-hook paint and the
        // no-technique fallback both look deliberate rather than defaulting to ink.
        style={{ ...style, position: 'relative', color: `var(${DUOTONES[duotone].cssVar})` }}
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
