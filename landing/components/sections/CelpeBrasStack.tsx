'use client'

import { useEffect, useRef, useState } from 'react'

interface CardConfig {
  icon: string
  bg: string
  text: string
}

interface Props {
  titles: string[]
  cardConfig: CardConfig[]
}

// How many px of scroll per card transition
const SCROLL_PER_CARD = 400

export default function CelpeBrasStack({ titles, cardConfig }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const sectionRef    = useRef<HTMLDivElement>(null)
  const sectionTopRef = useRef(0)

  useEffect(() => {
    const updateTop = () => {
      sectionTopRef.current = sectionRef.current?.offsetTop ?? 0
    }
    updateTop()
    window.addEventListener('resize', updateTop)
    return () => window.removeEventListener('resize', updateTop)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const scrolledIn = window.scrollY - sectionTopRef.current
      if (scrolledIn < 0) return
      const idx = Math.min(
        Math.floor(scrolledIn / SCROLL_PER_CARD),
        titles.length - 1,
      )
      setActiveIndex(idx)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [titles.length])

  return (
    <div ref={sectionRef} style={{ height: `calc(${(titles.length - 1) * SCROLL_PER_CARD}px + 100dvh)`, overflowX: 'clip' }}>
      <div className="sticky top-0 flex flex-col justify-center" style={{ height: '100dvh', isolation: 'isolate', overflowX: 'clip' }}>
        {/* Card stack — positioned relative to this anchor */}
        <div className="relative" style={{ height: 180 }}>
          {titles.map((title, i) => {
            const offset = i - activeIndex   // negative = past, 0 = active, positive = upcoming
            const isPast    = offset < 0
            const isActive  = offset === 0
            const isFuture  = offset > 0

            return (
              <div
                key={i}
                style={{
                  position:   'absolute',
                  inset:      0,
                  zIndex:     isPast ? 0 : titles.length - offset,
                  opacity:    isPast ? 0 : isFuture ? Math.max(0, 1 - offset * 0.15) : 1,
                  transform:  isPast
                    ? 'translateY(-110%) scale(0.95)'
                    : `translateY(${offset * 80}px) scale(${1 - offset * 0.04})`,
                  transition: 'transform 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease',
                  pointerEvents: isActive ? 'auto' : 'none',
                }}
              >
                <div
                  className="flex items-center gap-[32px] w-full overflow-hidden rounded-[44px] px-[32px] py-[32px]"
                  style={{
                    minHeight: '164px',
                    backgroundColor: cardConfig[i].bg,
                    boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25), 0px 2px 4px 0px rgba(0,0,0,0.18)',
                  }}
                >
                  <div className="shrink-0" style={{ width: 'clamp(48px, 6vw, 100px)', height: 'clamp(48px, 6vw, 100px)' }}>
                    <img src={cardConfig[i].icon} alt="" className="w-full h-full object-contain pointer-events-none" />
                  </div>
                  <p
                    className="font-accent font-bold flex-1 min-w-0"
                    style={{ fontSize: 'clamp(20px, 2vw, 36px)', lineHeight: '1.1', color: cardConfig[i].text, letterSpacing: '0.12em' }}
                  >
                    {title}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Scroll progress dots */}
        <div className="flex justify-center gap-[6px] mt-4 px-[16px]">
          {titles.map((_, i) => (
            <div
              key={i}
              style={{
                width:           i === activeIndex ? 20 : 6,
                height:          6,
                borderRadius:    4,
                backgroundColor: '#323031',
                opacity:         i === activeIndex ? 1 : 0.25,
                transition:      'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
