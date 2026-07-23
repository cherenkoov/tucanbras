'use client'

import { useRef, type CSSProperties, type Ref } from 'react'
import { AdaptiveDuotoneFilter } from './AdaptiveText'
import { useAdaptiveText } from './useAdaptiveText'

interface AdaptiveIconProps {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
  // Escape hatch: force the icon to one duotone side in static mode (touch/reduced-
  // motion) when the layered fill can't resolve its spot. Desktop backdrop ignores it.
  staticFill?: 'ink' | 'cream'
}

// Icon counterpart of AdaptiveText: an SVG symbol over the moving collage whose colour
// adapts to the background behind it (ink↔cream duotone). The image's alpha acts as the
// glyph mask; the real <img> (solid ink art) stays as the fallback when neither
// technique can run. Size the icon via `style.width` — the aspect comes from the file.
export default function AdaptiveIcon({ src, alt = '', className, style, staticFill }: AdaptiveIconProps) {
  const wrapRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLSpanElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useAdaptiveText({ textRef: wrapRef, overlayRef, imageSrc: src, imageRef: imgRef, staticFill })

  return (
    <>
      <AdaptiveDuotoneFilter />

      <span
        ref={wrapRef as Ref<HTMLSpanElement>}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={className}
        style={{ ...style, position: 'relative', display: 'inline-block' }}
      >
        <img src={src} alt="" aria-hidden="true" ref={imgRef} style={{ width: '100%', height: 'auto', display: 'block' }} />
        {/* Overlay for backdrop mode (hidden in static mode); covers the icon box. */}
        <span
          ref={overlayRef}
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'none' }}
        />
      </span>
    </>
  )
}
