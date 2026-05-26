'use client'

import { useEffect, type RefObject } from 'react'

const CLOUD_SIDES: Record<string, 'left' | 'right'> = {
  'Cloud 06':   'left',
  'Cloud 07':   'left',
  'Cloud 05':   'left',
  'Cloud 08':   'left',
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

    const tids: (ReturnType<typeof setTimeout> | null)[] = Object.keys(CLOUD_SIDES).map(() => null)

    const playAll = () => {
      Object.keys(CLOUD_SIDES).forEach((id, i) => {
        tids[i] = setTimeout(() => {
          const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
          if (!el) return
          void el.getBoundingClientRect()
          el.style.transition = `transform 1.8s cubic-bezier(0.16,1,0.3,1), opacity 1.8s ease-out`
          el.classList.add('cloud-visible')
        }, i * 150)
      })
    }

    const resetAll = () => {
      tids.forEach((tid, i) => { if (tid !== null) { clearTimeout(tid); tids[i] = null } })
      Object.keys(CLOUD_SIDES).forEach(id => {
        const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
        if (!el) return
        el.style.transition = ''
        el.classList.remove('cloud-visible')
      })
    }

    // Observe an HTML sentinel covering the cloud zone (top ~32% of the SVG, clouds live there).
    // IntersectionObserver on SVG <g> elements is unreliable — they lack CSS layout boxes.
    const sentinel = document.createElement('div')
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:32%;pointer-events:none;'
    container.appendChild(sentinel)

    let active = false
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !active) { active = true;  playAll()  }
      else if (!entry.isIntersecting && active) { active = false; resetAll() }
    }, { threshold: 0 })
    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      sentinel.remove()
      resetAll()
    }
  }, [enabled, containerRef])
}
