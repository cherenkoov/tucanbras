import type { CSSProperties } from 'react'

// Icon counterpart of AdaptiveText: an SVG symbol that sits directly on the background
// collage (today only the Comparison «VS»). It used to run the same adaptive duotone as
// the headings — the art's alpha was the glyph mask and the fill was sampled from the
// background behind it. Removed 2026-10-03 with the text duotone: the symbol is now the
// flat brand green, like the headings beside it.
//
// The art keeps its own colours in the file, so the flat green is painted here: flood the
// filter region with the colour and composite it THROUGH the image's alpha, which leaves
// the silhouette untouched and recolours everything inside it. A CSS mask would do the
// same, but then the <img> could no longer size the box from the file's own aspect.
const ICON_COLOR = '#8fd096' // --color-green; a filter's flood-color takes no var()
const FILTER_ID = 'adaptive-icon-green'

interface AdaptiveIconProps {
  src: string
  alt?: string
  className?: string
  style?: CSSProperties
}

export default function AdaptiveIcon({ src, alt = '', className, style }: AdaptiveIconProps) {
  return (
    <>
      {/* One id for every instance: the filter is a constant, so duplicate definitions
          are identical and the first one in the document answers for all of them. */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id={FILTER_ID} colorInterpolationFilters="sRGB">
          <feFlood floodColor={ICON_COLOR} result="fill" />
          <feComposite in="fill" in2="SourceAlpha" operator="in" />
        </filter>
      </svg>

      <span
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={className}
        style={{ ...style, display: 'inline-block' }}
      >
        <img
          src={src}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: 'auto', display: 'block', filter: `url(#${FILTER_ID})` }}
        />
      </span>
    </>
  )
}
