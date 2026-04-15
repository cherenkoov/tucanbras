'use client'

import { useEffect, useRef, useState } from 'react'
import type { PlanCard } from '@/types'
import { PlanSection, CONFIG } from '@/components/PlanSectionShared'

const SCROLL_PER_CARD = 200
const CARD_HEIGHT     = 600  // approximate mobile card height

export default function PlansStack({ plans }: { plans: PlanCard[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current
      if (!el) return
      const scrolledIn = -el.getBoundingClientRect().top
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
      <div className="sticky" style={{ top: 168 }}>
        <div className="relative" style={{ height: CARD_HEIGHT }}>
          {plans.map((plan, i) => {
            const offset   = i - activeIndex
            const isPast   = offset < 0
            const isActive = offset === 0

            return (
              <div
                key={plan.name}
                style={{
                  position:    'absolute',
                  inset:       0,
                  zIndex:      isPast ? 0 : plans.length - offset,
                  opacity:     isPast ? 0 : Math.max(0, 1 - offset * 0.15),
                  transform:   isPast
                    ? 'translateY(-110%) scale(0.97)'
                    : `translateY(${offset * 16}px) scale(${1 - offset * 0.03})`,
                  transition:  'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <PlanSection plan={plan} index={i} />
              </div>
            )
          })}
          {/* Progress dots — inside card container, pinned to bottom */}
          <div className="absolute bottom-[-28px] left-0 right-0 flex justify-center gap-[6px]">
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
    </div>
  )
}
