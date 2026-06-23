'use client'

import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useAdaptiveHeadingColor } from './useAdaptiveHeadingColor'

interface AdaptiveHeadingProps {
  className?: string
  style?: CSSProperties
  restingColor: string
  flipColor: string
  figureId: string
  featherPx?: number
  children: ReactNode
}

// Until the hook installs the silhouette mask, hide the flip layer entirely
// (a fully transparent mask => alpha 0 => nothing revealed => only the base shows).
const HIDDEN_MASK = 'linear-gradient(#0000, #0000)'

export default function AdaptiveHeading({
  className,
  style,
  restingColor,
  flipColor,
  figureId,
  featherPx = 12,
  children,
}: AdaptiveHeadingProps) {
  const baseRef = useRef<HTMLHeadingElement>(null)
  const flipRef = useRef<HTMLHeadingElement>(null)

  useAdaptiveHeadingColor({ baseRef, flipRef, figureId, featherPx, enabled: true })

  return (
    <div className="relative w-full">
      <h2 ref={baseRef} className={className} style={{ ...style, color: restingColor }}>
        {children}
      </h2>
      <h2
        ref={flipRef}
        aria-hidden="true"
        className={className}
        style={{
          ...style,
          color: flipColor,
          position: 'absolute',
          inset: 0,
          margin: 0,
          pointerEvents: 'none',
          WebkitMaskImage: HIDDEN_MASK,
          maskImage: HIDDEN_MASK,
        }}
      >
        {children}
      </h2>
    </div>
  )
}
