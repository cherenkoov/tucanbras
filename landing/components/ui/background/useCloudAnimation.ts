'use client'

import { useEffect, type RefObject } from 'react'

const CLOUD_SIDES: Record<string, 'left' | 'right'> = {
  'Cloud 06':   'left',
  'Cloud 07':   'left',
  'Cloud 05':   'left',
  'Cloud 01_2': 'left',
  'Cloud 03':   'right',
  'Cloud 02':   'right',
  'Cloud 01':   'right',
}

export function useCloudAnimation(
  containerRef: RefObject<HTMLDivElement | null>,
  { enabled }: { enabled: boolean }
): void {
  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const tids: ReturnType<typeof setTimeout>[] = []

    Object.entries(CLOUD_SIDES).forEach(([id], i) => {
      // Initial class is already baked into the SVG string by injectRailPath — no flash on first paint.
      const tid = setTimeout(() => {
        // Re-query: StrictMode may have remounted DOM, old ref would be disconnected
        const fresh = container.querySelector<SVGGElement>(`[id="${id}"]`)
        if (!fresh) return
        // Force reflow so browser commits the initial opacity/transform before the transition.
        void fresh.getBoundingClientRect()
        fresh.style.transition = `transform 1.8s cubic-bezier(0.16,1,0.3,1), opacity 1.8s ease-out`
        fresh.classList.add('cloud-visible')
      }, 200 + i * 150)

      tids.push(tid)
    })

    return () => {
      tids.forEach(clearTimeout)
      Object.keys(CLOUD_SIDES).forEach(id => {
        const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
        if (!el) return
        el.classList.remove('cloud-visible')
        el.style.transition = ''
      })
    }
  }, [enabled, containerRef])
}
