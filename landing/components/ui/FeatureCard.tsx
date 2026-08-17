'use client'

import type { CSSProperties } from 'react'
import FeatureCardDecor from '@/components/ui/FeatureCardDecor'
import { bloomOnTap } from '@/components/ui/tapBloom'

/**
 * Одна карточка ряда CELPE-BRAS (десктопная раскладка; мобильный стек рисует свою в
 * `CelpeBrasStack`).
 *
 * Клиентская, и это единственная причина, по которой она живёт отдельным файлом: секция
 * `CelpeBras` — серверный компонент, функцию через границу не передать, а `bloomOnTap`
 * обязан висеть ИМЕННО на карточке — на ней же `group/card`, на который отвечает растение.
 * Тот же приём, что у `FreeLessonButton` в Hero.
 *
 * Тач на ширинах ≥1024 существует (iPad в альбомной, тач-ноутбуки): там у карточки нет
 * ни наведения, ни `:active` достаточной длины — без этого обработчика разрастание
 * растения оставалось бы мёртвой разметкой. Мышь `bloomOnTap` игнорирует сам.
 */
export default function FeatureCard({ index, title, icon, bg, tint, text }: {
  index: number
  title: string
  icon: string
  bg: string
  tint: string
  text: string
}) {
  return (
    <div
      data-glass-center
      data-adaptive-cover={bg}
      onPointerDown={bloomOnTap}
      /* `group/card` is NAMED: the plant inside answers to this card's hover, and an
         unnamed group would also fire from any ancestor group the section gains. */
      className="group/card glass relative flex flex-1 items-center gap-[48px] min-w-[300px] overflow-hidden rounded-[44px] px-[32px] py-[32px] hover:scale-[1.04] active:scale-[0.95]"
      style={{
        minHeight: '164px',
        '--glass-tint': tint,
        '--glass-solid': bg,
        /* Only the drop shadow: the inner highlight moves into FeatureCardDecor, which
           draws it ABOVE the plant the way the design does. */
        boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.18)',
      } as CSSProperties}
    >
      <FeatureCardDecor index={index} />

      {/* Icon — `relative` so it paints over the decor layer: an absolutely positioned
          sibling outranks a static one whatever the DOM order. */}
      <div className="relative shrink-0" style={{ width: 'clamp(48px, 6vw, 100px)', height: 'clamp(48px, 6vw, 100px)' }}>
        <img src={icon} alt="" className="w-full h-full object-contain pointer-events-none" />
      </div>

      {/* Label */}
      <p
        className="relative font-accent font-bold flex-1 min-w-0"
        style={{ fontSize: 'clamp(20px, 2vw, 36px)', lineHeight: '1.1', color: text, letterSpacing: '0.12em' }}
      >
        {title}
      </p>
    </div>
  )
}
