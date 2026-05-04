'use client'

import { useRef } from 'react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface Props {
  children:             React.ReactNode
  className?:           string
  maxDegrees?:          number
  velocitySensitivity?: number
  decay?:               number
  smoothing?:           number
  transformOrigin?:     string
}

export default function ScrollSway({
  children,
  className,
  maxDegrees          = 8,
  velocitySensitivity = 0.15,
  decay               = 0.85,
  smoothing           = 0.1,
  transformOrigin     = 'bottom center',
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollAnimation({
    ref,
    maxDegrees,
    decay,
    velocitySensitivity,
    setup: (container) => {
      let current = 0
      return (target) => {
        current += (target - current) * smoothing
        container.style.transform = `rotate(${current.toFixed(3)}deg)`
      }
    },
  })

  return (
    <div
      ref={ref}
      className={`w-full h-full${className ? ` ${className}` : ''}`}
      style={{ transformOrigin }}
    >
      {children}
    </div>
  )
}
