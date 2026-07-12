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

    // The clouds live in a `dangerouslySetInnerHTML` SVG layer. They render at
    // opacity:0 (see CLOUD_CSS) and become visible ONLY by adding `.cloud-visible`
    // here. Two things make that fragile, so this hook must be defensive:
    //   1. During load the clouds SVG can be RE-INJECTED (fresh <g> nodes, hidden
    //      again) — which silently wiped an already-played reveal, leaving the sky
    //      empty (worst at zoomed widths where the parallax/coverage churn is longest).
    //   2. IntersectionObserver on SVG <g> is unreliable (no CSS box), so the reveal
    //      is gated on an HTML sentinel instead.

    const tids: ReturnType<typeof setTimeout>[] = []
    const clearTids = () => { tids.forEach(clearTimeout); tids.length = 0 }

    // Snap a single cloud to visible without animating (used when re-applying after a
    // re-injection so we don't restart the slide, and for the reduced-motion frame).
    const show = (id: string) => {
      const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
      if (el) el.classList.add('cloud-visible')
    }
    // Re-apply the reveal to any cloud nodes currently missing it — cheap and
    // idempotent, so it's safe to call on every re-injection while in view.
    const ensureShown = () => Object.keys(CLOUD_SIDES).forEach(show)

    // Staggered slide-in for the initial reveal / each re-entry into view.
    const playAll = () => {
      clearTids()
      Object.keys(CLOUD_SIDES).forEach((id, i) => {
        tids.push(setTimeout(() => {
          const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
          if (!el) return
          void el.getBoundingClientRect() // flush hidden state so the transition runs
          el.style.transition = `transform 1.8s cubic-bezier(0.16,1,0.3,1), opacity 1.8s ease-out`
          el.classList.add('cloud-visible')
        }, i * 150))
      })
    }
    const resetAll = () => {
      clearTids()
      Object.keys(CLOUD_SIDES).forEach(id => {
        const el = container.querySelector<SVGGElement>(`[id="${id}"]`)
        if (!el) return
        el.style.transition = ''
        el.classList.remove('cloud-visible')
      })
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // `inView` drives both the reveal and the re-injection guard. Reduced motion pins
    // it true (static first frame — the old early-return left clouds stuck hidden).
    let inView = reduceMotion

    // Guard against re-injection: whenever the clouds SVG is (re)built while in view,
    // re-apply `.cloud-visible` so a reveal can never be silently wiped. childList
    // mutations only fire on node add/remove (layer injection), not on the transform
    // writes the other animations do — so this stays quiet after load settles.
    const reinjectGuard = new MutationObserver(() => { if (inView) ensureShown() })
    reinjectGuard.observe(container, { childList: true, subtree: true })

    if (reduceMotion) {
      ensureShown()
      return () => reinjectGuard.disconnect()
    }

    // Observe an HTML sentinel covering the cloud zone (top ~32% of the SVG, clouds live there).
    const sentinel = document.createElement('div')
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:32%;pointer-events:none;'
    container.appendChild(sentinel)

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !inView) { inView = true; playAll() }
      else if (!entry.isIntersecting && inView) { inView = false; resetAll() }
    }, { threshold: 0 })
    observer.observe(sentinel)

    return () => {
      observer.disconnect()
      reinjectGuard.disconnect()
      sentinel.remove()
      resetAll()
    }
  }, [enabled, containerRef])
}
