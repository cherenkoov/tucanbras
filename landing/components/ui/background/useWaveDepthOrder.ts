'use client'

import { useEffect, type RefObject } from 'react'

// Depth-order the surf queue: FARTHER waves paint ON TOP (higher z), nearer-shore behind.
//
// The queue instances (`.beach-wave` inside `.beach-wave-queue`) all rise at the SAME speed and
// are evenly phase-staggered, so they never overtake each other. The required paint order is
// therefore simply "descending phase": the wave nearest the shore (phase → 1) is the backmost,
// the one that just respawned (phase → 0) is the frontmost. The markup ships in that order, but
// it must be re-established every time a wave wraps.
//
// We DERIVE the order from the SVG timeline rather than reacting to SMIL `repeatEvent`s. An
// event-driven version worked in theory but is a chain that must never drop a link: if a single
// instance misses one `repeatEvent`, it stays wrong forever (the instance whose `begin` is
// exactly 0 was the one that got stuck). Recomputing phase is stateless and self-healing — any
// wave that ends up misplaced is put back on the next tick.
//
// Cost is trivial (a handful of elements, twice a second) and the check is skipped entirely when
// nothing moved. Reordering while a wave is mid-wrap is invisible anyway: it has just dissolved
// at the shore and respawned below the fold.
const TICK_MS = 500

export function useWaveDepthOrder(
  ref: RefObject<HTMLElement | null>,
  reRunKey: unknown, // re-attach when the SVG is (re)injected (e.g. queueCount change)
): void {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // There can be MORE than one queue in the tree (the beach + the terminal sea-fill band);
    // order each independently against its OWN <svg> timeline.
    const containers = Array.from(root.querySelectorAll<SVGGElement>('.beach-wave-queue'))
    const queues = containers
      .map(container => {
        const svgRoot = container.ownerSVGElement
        if (!svgRoot) return null
        // Each instance's rise animation is its FIRST animateTransform (foam's jump comes later).
        const items = Array.from(container.querySelectorAll<SVGGElement>(':scope > .beach-wave'))
          .map(inst => {
            const anim = inst.querySelector('animateTransform')
            if (!anim) return null
            const begin = parseFloat(anim.getAttribute('begin') ?? '0') // "-44.44s" → -44.44
            const dur = parseFloat(anim.getAttribute('dur') ?? '0')     // "50.0s"   → 50
            return dur > 0 ? { inst, begin, dur } : null
          })
          .filter((v): v is { inst: SVGGElement; begin: number; dur: number } => v !== null)
        return items.length >= 2 ? { container, svgRoot, items } : null
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
    if (queues.length === 0) return

    const reorder = () => {
      for (const { container, svgRoot, items } of queues) {
        const t = svgRoot.getCurrentTime()
        // phase ∈ [0,1): 0 = just respawned (farthest, front), →1 = at the shore (nearest, back).
        const desired = items
          .map(it => {
            let p = ((t - it.begin) / it.dur) % 1
            if (p < 0) p += 1
            return { inst: it.inst, p }
          })
          .sort((a, b) => b.p - a.p) // descending phase → nearest shore first (backmost)
          .map(w => w.inst)

        const current = container.children
        let same = current.length === desired.length
        if (same) for (let i = 0; i < desired.length; i++) if (current[i] !== desired[i]) { same = false; break }
        if (same) continue // no DOM churn — moving SMIL nodes needlessly risks a visual hitch

        for (const inst of desired) container.appendChild(inst)
      }
    }

    reorder()
    const id = window.setInterval(reorder, TICK_MS)
    return () => window.clearInterval(id)
  }, [ref, reRunKey])
}
