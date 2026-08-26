'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { PlanCard } from '@/types'
import { PlanSection, CONFIG } from '@/components/sections/PlanSectionShared'

const SCROLL_PER_CARD = 400

export default function PlansStack({ plans, locale }: { plans: PlanCard[]; locale: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [cardHeight, setCardHeight]   = useState(600)

  const sectionRef    = useRef<HTMLDivElement>(null)
  const cardRefs      = useRef<(HTMLDivElement | null)[]>([])
  const sectionTopRef = useRef(0)

  const measure = useCallback(() => {
    const heights = cardRefs.current.map(el => el?.offsetHeight ?? 0)
    const maxH = Math.max(...heights)
    if (maxH > 0) setCardHeight(maxH)
    // Absolute document offset — offsetTop is relative to the nearest
    // positioned ancestor (<main className="relative">), which would make
    // this far smaller than window.scrollY and jump activeIndex to the last card.
    const rectTop = sectionRef.current?.getBoundingClientRect().top ?? 0
    sectionTopRef.current = rectTop + window.scrollY
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
    <div ref={sectionRef} style={{ height: `calc(${(plans.length - 1) * SCROLL_PER_CARD}px + 100dvh)`, overflowX: 'clip' }}>
      {/*
        Липнет НЕ к верху вьюпорта, а к нижней грани фиксированного хедера, и высоту
        берёт ровно ту, что от экрана остаётся: карточка центруется по ВИДИМОЙ части,
        а не по всему экрану. С `top-0` + `100dvh` центр стопки совпадал с центром
        вьюпорта, и на телефоне, где карточка почти во весь экран, её верх (имя тарифа
        и цена) уходил под хедер.

        `safe center` вместо `center`: когда карточка ВЫШЕ оставшейся полосы, обычное
        центрирование выпихивает её в обе стороны разом — и верх снова прячется под
        хедером. `safe` в этом случае прижимает к началу, то есть к нижней грани
        хедера, и срезается низ (точки прогресса), а не заголовок. Браузер без
        поддержки просто отбросит объявление и получит flex-start — тот же фолбэк.
      */}
      <div
        className="sticky flex flex-col"
        style={{
          top: 'var(--header-offset)',
          height: 'calc(100dvh - var(--header-offset))',
          justifyContent: 'safe center',
          isolation: 'isolate',
          overflowX: 'clip',
        }}
      >

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
                <PlanSection plan={plan} index={i} locale={locale} />
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
