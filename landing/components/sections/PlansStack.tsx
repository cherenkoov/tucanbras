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
    // Сравнение со старым значением — обязательное условие наблюдателя ниже: без него
    // каждый замер писал бы стейт, а каждая запись будила бы наблюдателя.
    if (maxH > 0) setCardHeight(prev => (Math.abs(prev - maxH) > 0.5 ? maxH : prev))
    // Absolute document offset — offsetTop is relative to the nearest
    // positioned ancestor (<main className="relative">), which would make
    // this far smaller than window.scrollY and jump activeIndex to the last card.
    const rectTop = sectionRef.current?.getBoundingClientRect().top ?? 0
    sectionTopRef.current = rectTop + window.scrollY
  }, [])

  useEffect(() => {
    measure()
    // Наблюдатель за САМИМИ карточками, а не только `resize` окна. Карточки лежат
    // абсолютно, в высоту коробки стопки не вкладываются, и высота у них доезжает
    // ПОСЛЕ первого замера — шрифты, декор плашки, перенос подписи кнопки. Замер на
    // маунте отдавал `cardHeight` меньше настоящей самой высокой карточки (замерено:
    // 482 против 529.5), коробка стопки оставалась короткой, и карточка вылезала за
    // низ липкого блока — а он клипует. На экране это и был «тариф то обрезается, то
    // нет»: резалась только карточка выше устаревшего замера и только после того, как
    // стопка отлипала (пока она приклеена, её низ совпадает с низом экрана, и линия
    // среза не видна). Ширина карточек тут ни при чём — наблюдаем ради высоты.
    const ro = new ResizeObserver(measure)
    cardRefs.current.forEach(el => el && ro.observe(el))
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
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
        Липнет НЕ к верху вьюпорта, а к нижней грани фиксированного хедера: карточка
        центруется по ВИДИМОЙ части экрана, а не по всему экрану. С `top-0` + `100dvh`
        центр стопки совпадал с центром вьюпорта, и на телефоне, где карточка почти во
        весь экран, её верх (имя тарифа и цена) уходил под хедер.

        Высота — `min-height`, а НЕ `height`, и это не косметика: блок клипует (см.
        `overflow-x` ниже), поэтому всё, что не влезло, режется. С жёсткой высотой
        карточка выше оставшейся полосы вылезала за низ коробки и обрезалась — видно
        это становилось, когда стопка отлипала и линия среза уезжала с нижней грани
        экрана вверх. С `min-height` коробка растёт под содержимое: полосы хватает —
        карточка стоит по центру, не хватает — коробка становится ровно по карточке, и
        свободного места для центрирования просто нет, то есть карточка сама встаёт под
        хедер, а за низ экрана уходит хвост (точки прогресса), который и так за кадром.
        Отрицательного свободного места при этом не возникает нигде, поэтому `safe`
        центрированию тут не нужен.
      */}
      <div
        className="sticky flex flex-col justify-center"
        style={{
          top: 'var(--header-offset)',
          minHeight: 'calc(100dvh - var(--header-offset))',
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
