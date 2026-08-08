'use client'

import { useState, useEffect } from 'react'

/**
 * `prefers-reduced-motion: reduce`, live.
 *
 * For animations driven by React state (a dropdown opening) rather than by the
 * RAF hooks — those check the media query themselves and simply never start.
 * Starts false so SSR and the first paint agree; the query settles right after
 * mount, before anything can be opened.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return reduced
}
