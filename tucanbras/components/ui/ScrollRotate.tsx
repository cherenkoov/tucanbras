'use client'

import { useEffect, useRef } from 'react'

export default function ScrollRotate({
  children,
  degreesPerScreen = 25,
  className,
  transformOrigin = 'center center',
}: {
  children:          React.ReactNode
  degreesPerScreen?: number
  className?:        string
  transformOrigin?:  string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const update = () => {
      const rotation = (window.scrollY / window.innerHeight) * degreesPerScreen
      el.style.transform = `rotate(${rotation}deg)`
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [degreesPerScreen])

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
