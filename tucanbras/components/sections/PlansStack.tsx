'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { PlanCard } from '@/types'
import { PlanSection, CONFIG } from '@/components/sections/PlanSectionShared'

const SCROLL_PER_CARD = 400
const PIN_TOP = 168

export default function PlansStack({ plans }: { plans: PlanCard[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [cardHeight, setCardHeight]   = useState(600)

  const sectionRef    = useRef<HTMLDivElement>(null)
  const cardRefs      = useRef<(HTMLDivElement | null)[]>([])
  const sectionTopRef = useRef(0)

  const measure = useCallback(() => {
    const heights = cardRefs.current.map(el => el?.offsetHeight ?? 0)
    const maxH = Math.max(...heights)
    if (maxH > 0) setCardHeight(maxH)
    sectionTopRef.current = sectionRef.current?.offsetTop ?? 0
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  useEffect(() => {
    const onScroll = () => {
      const scrolledIn = window.scrollY - sectionTopRef.current
      if (scrolledIn < 0) return
      const idx = Math.min(Math.floor(scrolledIn / SCROLL_PER_CARD), plans.length - 1)
      setActiveIndex(idx)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [plans.length])

  return (
    <div ref={sectionRef} style={{ height: `calc(${(plans.length - 1) * SCROLL_PER_CARD}px + 100vh)` }}>
      <div className="sticky" style={{ top: PIN_TOP, isolation: 'isolate' }}>

        {/* Card stack */}
        <div className="relative" style={{ height: cardHeight }}>
          {plans.map((plan, i) => {
            const offset   = i - activeIndex
            const isPast   = offset < 0
            const isActive = offset === 0

            return (
              <div
                key={plan.name}
                ref={el => { cardRefs.current[i] = el }}
                style={{
                  position:   'absolute',
                  top:        0,
                  left:       0,
                  right:      0,
                  zIndex:     isPast ? 0 : plans.length - offset,
                  opacity:       isPast ? 0 : Math.max(0, 1 - offset * 0.15),
                  transform:     isPast
                    ? 'translateY(-110%) scale(0.95)'
                    : `translateY(${offset * 80}px) scale(${1 - offset * 0.04})`,
                  transition:    'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <PlanSection plan={plan} index={i} />
              </div>
            )
          })}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-[6px] mt-4">
          {plans.map((_, i) => (
            <div
              key={i}
              style={{
                width:           i === activeIndex ? 20 : 6,
                height:          6,
                borderRadius:    4,
                backgroundColor: CONFIG[i].accent,
                opacity:         i === activeIndex ? 1 : 0.35,
                transition:      'all 0.3s ease',
              }}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
