import { useEffect, useState, useRef, useCallback } from 'react'
import { headerOffset } from '@/components/ui/AnchorScrollHandler'

/**
 * Which nav section currently owns the viewport, as an index into `hrefs`.
 *
 * Two readers, both in components/sections/Header.tsx:
 *  • desktop — the pill cylinder. The active section's pill sits in the header
 *    slot and the rest hang below it in cyclic order, so a change here makes them
 *    trade places (DisplayedDrum);
 *  • every width — the "become a tutor" pill, which comes out on #tutors alone.
 *
 * The index only moves when a section actually takes the viewport. In the gaps —
 * #hero, #comparison, the footer — it LATCHES on the last one, so the slot keeps
 * holding About while the reader crosses #comparison and the swap happens the
 * moment #tutors arrives. That is the whole point of the latch: no half states,
 * and on mobile it is also what keeps the hint pill from blinking in the 80px gap
 * between two sections.
 *
 * The probe is the centre of the *content* viewport, i.e. below the fixed header —
 * hence headerOffset(), which is width-aware because the header is.
 *
 * Runs at every width. It used to be gated behind the `lg:` breakpoint, back when
 * the cylinder was the only reader: one passive scroll listener, coalesced into a
 * frame, that reads scrollY and nothing else. `measure()` is the part that touches
 * layout, and it only runs on attach and on resize.
 */

export interface SectionBox { top: number; bottom: number }

/**
 * probe (document coords) → index. `current` is the latched value, or null when
 * there is no history yet (first measure, e.g. a reload with restored scroll).
 * Exported so the latch can be asserted without a browser — see
 * scripts/verifyHeaderDrum.ts.
 */
export function activeSectionIndex(
  boxes: SectionBox[],
  probe: number,
  current: number | null,
): number {
  // A missing or not-yet-laid-out section would put every box at the document
  // origin and pick the last one — hold instead.
  if (boxes.length === 0 || boxes.some(b => b.bottom <= b.top)) return current ?? 0

  for (let i = 0; i < boxes.length; i++) {
    if (probe >= boxes[i].top && probe <= boxes[i].bottom) return i
  }
  // In a gap. Keep what the slot already shows…
  if (current !== null) return current
  // …or, with no history, take the nearest section above the probe. This is the
  // deep-link / restored-scroll path: landing inside #comparison must show About,
  // not snap back to the first pill.
  let fallback = 0
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].top <= probe) fallback = i
  }
  return fallback
}

export function useActiveSection(hrefs: string[]): {
  active: number
  /** Set the index directly and hold it for `holdMs`, ignoring scroll meanwhile. */
  pin: (index: number, holdMs: number) => void
} {
  const [active, setActive] = useState(0)

  // Written from event handlers only. `activeRef` mirrors state so the scroll
  // listener can read the latch without being re-created on every change.
  const activeRef    = useRef<number | null>(null)
  const pinnedUntilRef = useRef(0)

  const pin = useCallback((index: number, holdMs: number) => {
    pinnedUntilRef.current = performance.now() + holdMs
    activeRef.current      = index
    setActive(index)
  }, [])

  // `hrefs` is rebuilt on every parent render, so the effect keys off its contents.
  const key = hrefs.join('|')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const ids = key.split('|')
    if (ids.length === 0) return

    let boxes: SectionBox[] = []
    let raf = 0

    // Document coords, cached: scrolling only reads window.scrollY.
    const measure = () => {
      const y = window.scrollY
      boxes = ids.map(id => {
        const el = document.querySelector(id)
        if (!el) return { top: 0, bottom: 0 }
        const r = el.getBoundingClientRect()
        return { top: r.top + y, bottom: r.bottom + y }
      })
    }

    const update = () => {
      // A click pins the target while scrollToElement tweens towards it; without
      // this the probe would sweep through every section on the way and the
      // cylinder would spin instead of landing.
      if (performance.now() < pinnedUntilRef.current) return
      const probe = window.scrollY + (headerOffset() + window.innerHeight) / 2
      const next  = activeSectionIndex(boxes, probe, activeRef.current)
      if (next === activeRef.current) return
      activeRef.current = next
      setActive(next)
    }

    // One passive listener, coalesced into a frame.
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; update() })
    }

    const onResize = () => { measure(); update() }

    // Layout settles late (fonts, images, the tutor cards) — re-measure then.
    const ro = new ResizeObserver(onResize)

    measure()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('load', onResize)
    const main = document.querySelector('main')
    if (main) ro.observe(main)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onResize)
      ro.disconnect()
      if (raf) { cancelAnimationFrame(raf); raf = 0 }
    }
  }, [key])

  return { active, pin }
}
