'use client'

import { useEffect, useRef, useState } from 'react'
import type { TutorsProps } from '@/types'
import type { Tutor } from '@/lib/tutors'

// ─── Tutor card ──────────────────────────────────────────────────────────────

function TutorCard({ tutor }: { tutor: Tutor }) {
  return (
    <div className="flex flex-col w-full max-w-[410px] mx-auto">

      {/* Photo — overlaps 56px into card body */}
      <div className="relative w-full flex justify-center z-0 mb-[-56px]">
        <div
          className="relative overflow-hidden rounded-[21px]"
          style={{ width: 'calc(100% - 80px)', maxWidth: '326px', aspectRatio: '1/1' }}
        >
          {tutor.imageUrl ? (
            <img
              src={tutor.imageUrl}
              alt={tutor.fullName}
              className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
            />
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: '#a8d5ac' }} />
          )}
          {/* Inner shadow overlay */}
          <div
            className="absolute inset-0 rounded-[21px] pointer-events-none"
            style={{ boxShadow: 'inset 0px 4px 4px rgba(255,255,255,0.25), inset 0px -24px 36px rgba(0,0,0,0.32)' }}
          />
        </div>
      </div>

      {/* Card body */}
      <div className="relative rounded-[36px] pt-[12px] pb-[12px] px-[12px] z-10">

        {/* Cover — fills card, overflow visible */}
        <img
          src="/tutors/cover.svg"
          aria-hidden
          className="absolute inset-0 w-full h-full rounded-[36px] pointer-events-none"
          style={{ objectFit: 'cover', overflow: 'visible', boxShadow: 'inset 0px 4px 4px rgba(255,255,255,0.20), 0px 2px 4px rgba(0,0,0,0.18)' }}
        />

        {/* Content — relative so it stacks above cover */}
        <div className="relative flex flex-col gap-[20px]">

        {/* Name — first two words on line 1, rest on line 2 */}
        {(() => {
          const parts = tutor.fullName.split(' ')
          const line1 = parts.slice(0, 2).join(' ')
          const line2 = parts.slice(2).join(' ')
          return (
            <p
              className="font-heading font-normal text-cream text-center w-full"
              style={{ fontSize: 'clamp(22px, 2vw, 32px)', lineHeight: '1.15' }}
            >
              {line1}
              {line2 && <><br />{line2}</>}
            </p>
          )
        })()}

        {/* Language flags */}
        {tutor.languages.length > 0 && (
          <div className="flex items-center justify-center gap-[8px]">
            {tutor.languages.map(lang => (
              <img
                key={lang.code}
                src={lang.flagPath}
                alt={lang.name}
                title={lang.name}
                className="w-[32px] h-[32px] object-cover rounded-[4px] pointer-events-none"
              />
            ))}
          </div>
        )}

        {/* Quote / description */}
        {tutor.quote && (
          <p
            className="font-sans font-semibold text-cream text-center w-full"
            style={{ fontSize: 'clamp(16px, 1.6vw, 24px)', lineHeight: '1.4' }}
          >
            {tutor.quote}
          </p>
        )}

        {/* Specializations */}
        {tutor.specializations.length > 0 && (
          <div className="flex flex-col gap-[12px]">
            <p
              className="font-sans font-medium text-cream text-center tracking-[2px]"
              style={{ fontSize: 'clamp(13px, 1.1vw, 17px)', opacity: 0.7 }}
            >
              Специализации
            </p>
            <div className="flex flex-wrap gap-[8px] justify-center">
              {tutor.specializations.map(tag => (
                <span
                  key={tag}
                  className="font-sans font-medium text-cream text-center rounded-[24px] px-[21px] py-[12px]"
                  style={{ backgroundColor: 'rgba(50,48,49,0.4)', fontSize: 'clamp(13px, 1.1vw, 17px)', lineHeight: '1.3' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        </div>{/* end content */}
      </div>

    </div>
  )
}

// ─── Mobile carousel ─────────────────────────────────────────────────────────

const CARD_VW = 82   // card width as % of viewport
const PEEK_VW = (100 - CARD_VW) / 2  // spacer = half remaining space

function TutorCarousel({ tutors }: { tutors: Tutor[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.innerWidth < 1024) return
    const el = ref.current
    if (!el) return
    const cards = Array.from(el.children).slice(1, -1)
    const card = cards[1] as HTMLElement
    if (!card) return
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'instant' })
    setActiveIndex(1)
  }, [])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const center = el.scrollLeft + el.clientWidth / 2
    const cards = Array.from(el.children).slice(1, -1) // exclude spacers
    let closest = 0, minDist = Infinity
    cards.forEach((child, i) => {
      const c = child as HTMLElement
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setActiveIndex(closest)
  }

  const scrollToIndex = (i: number) => {
    const el = ref.current
    if (!el) return
    const cards = Array.from(el.children).slice(1, -1) // exclude spacers
    const card = cards[i] as HTMLElement
    if (!card) return
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Track */}
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-[12px]"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Left spacer — (100vw - cardWidth) / 2 - gap */}
        <div className="shrink-0" style={{ width: 'calc((100vw - min(82vw, 410px)) / 2 - 12px)' }} />

        {tutors.map((tutor, i) => (
          <div
            key={tutor.id}
            className="snap-center shrink-0"
            style={{ width: 'min(82vw, 410px)' }}
          >
            <TutorCard tutor={tutor} />
          </div>
        ))}

        {/* Right spacer */}
        <div className="shrink-0" style={{ width: 'calc((100vw - min(82vw, 410px)) / 2 - 12px)' }} />
      </div>

      {/* Dots */}
      <div className="flex justify-center items-center gap-[6px]">
        {tutors.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            aria-label={`Репетитор ${i + 1}`}
            style={{
              width:           i === activeIndex ? 20 : 8,
              height:          8,
              borderRadius:    4,
              backgroundColor: i === activeIndex ? 'var(--color-ink)' : 'rgba(43,42,43,0.25)',
              transition:      'all 0.3s ease',
              border:          'none',
              cursor:          'pointer',
              padding:         0,
              flexShrink:      0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Stub cards shown when DB is empty ───────────────────────────────────────

const STUB_TUTORS: Tutor[] = [
  {
    id: 1,
    fullName: 'Жоау Педро Алмейда',
    imageUrl: '/tutors/avatars/joau.png',
    languages: [
      { code: 'pt-BR', name: 'Português',  flagPath: '/flags/brazil.png' },
      { code: 'ru',    name: 'Русский',    flagPath: '/flags/russia.png' },
    ],
    quote: 'Мои уроки спокойные и структурные. Помогаю навести порядок в голове и наконец понять, как работает грамматика.',
    specializations: ['Грамматика', 'Для A1'],
    interests: [],
  },
  {
    id: 2,
    fullName: 'Мария Фернанда Соуза да Силва',
    imageUrl: '/tutors/avatars/maria.png',
    languages: [
      { code: 'pt-BR', name: 'Português', flagPath: '/flags/brazil.png' },
      { code: 'ru',    name: 'Русский',   flagPath: '/flags/russia.png' },
    ],
    quote: 'Объясняю просто и без занудства. Люблю примеры из реальной жизни в Бразилии и живую речь, а не учебниковый пластик.',
    specializations: ['Разговорная практика'],
    interests: [],
  },
  {
    id: 3,
    fullName: 'Ана Каролина Рибейру Кошта',
    imageUrl: '/tutors/avatars/ana.png',
    languages: [
      { code: 'pt-BR', name: 'Português', flagPath: '/flags/brazil.png' },
      { code: 'en',    name: 'English',   flagPath: '/flags/usa.png'    },
    ],
    quote: 'Делаю упор на уверенную речь и правильное произношение. Исправляю мягко, но эффективно.',
    specializations: ['Постановка произношения', 'Разговорная практика'],
    interests: [],
  },
  {
    id: 4,
    fullName: 'Лукас Матеус Перейра да Роша',
    imageUrl: '/tutors/avatars/lucas.png',
    languages: [
      { code: 'pt-BR', name: 'Português', flagPath: '/flags/brazil.png' },
      { code: 'en',    name: 'English',   flagPath: '/flags/usa.png'    },
      { code: 'ru',    name: 'Русский',   flagPath: '/flags/russia.png' },
    ],
    quote: 'Готовлю к жизни, работе и реальным ситуациям. Минимум воды, максимум полезного языка.',
    specializations: ['Бразильский для работы', 'Деловая коммуникация'],
    interests: [],
  },
  {
    id: 5,
    fullName: 'Рената Лима Фигейреду',
    imageUrl: '/tutors/avatars/renate.png',
    languages: [
      { code: 'pt-BR', name: 'Português', flagPath: '/flags/brazil.png' },
      { code: 'en',    name: 'English',   flagPath: '/flags/usa.png'    },
      { code: 'ru',    name: 'Русский',   flagPath: '/flags/russia.png' },
    ],
    quote: 'Помогаю подготовиться к экзаменам без паники. Чётко объясняю формат, требования и типичные ошибки.',
    specializations: ['Письменная речь', 'Подготовка к CELPE-BRAS'],
    interests: [],
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

interface TutorsSectionProps {
  data: TutorsProps['data']
  tutors: Tutor[]
}

export default function Tutors({ data, tutors }: TutorsSectionProps) {
  const displayTutors = tutors.length > 0 ? tutors : STUB_TUTORS

  return (
    <section id="tutors" className="w-full">
      <div className="flex flex-col gap-[64px] lg:gap-[80px] max-w-[1720px] mx-auto w-full">

        {/* ══ Headings row ══ */}
        <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[48px] items-start w-full">
          <h2
            className="font-heading font-bold text-ink flex-1"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
          >
            {data.heading1}
          </h2>
          <h2
            className="font-heading font-bold text-ink flex-1"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
          >
            {data.heading2}
          </h2>
        </div>

        {/* ══ Cards — carousel on all screen sizes ══ */}
        <div className="-mx-6">
          <TutorCarousel tutors={displayTutors} />
        </div>

        {/* ══ Description quote ══ */}
        <p
          className="font-involve font-bold text-ink text-center w-full uppercase"
          style={{ fontSize: 'clamp(13px, 1.2vw, 18px)', letterSpacing: '0.02em' }}
        >
          &ldquo;{data.description}&rdquo;
        </p>

        {/* ══ CTA button ══ */}
        <div className="flex justify-center w-full">
          <a
            href={data.ctaHref} // TODO: TBD
            className="flex items-center justify-center rounded-[66px] px-[48px]"
            style={{
              backgroundColor: '#2b2a2b',
              paddingTop: '44px',
              paddingBottom: '44px',
              boxShadow: 'var(--shadow-btn)',
              minWidth: '400px',
            }}
          >
            <span
              className="font-accent font-bold text-cream"
              style={{ fontSize: '32px', lineHeight: '32px' }}
            >
              {data.ctaText}
            </span>
          </a>
        </div>

      </div>
    </section>
  )
}
