'use client'

import { useRef, useState } from 'react'
import type { TutorsProps, Locale, FreeLessonModalStrings } from '@/types'
import type { Tutor } from '@/lib/tutors'
import { getStubTutors } from '@/lib/tutorStubs'
import FreeLessonModal from '@/components/ui/FreeLessonModal'

// ─── Tutor card ──────────────────────────────────────────────────────────────

function TutorCard({
  tutor,
  specializationsLabel,
  selectLabel,
  onSelect,
}: {
  tutor: Tutor
  specializationsLabel: string
  selectLabel: string
  onSelect: () => void
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hovered,  setHovered]  = useState(false)

  return (
    <div
      className="relative flex flex-col w-full max-w-[410px] mx-auto cursor-pointer select-none active:opacity-80 lg:active:opacity-100 transition-opacity"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
    >

      {/* Photo — overlaps 56px into card body */}
      <div className="relative w-full flex justify-center z-0 mb-[-64px]">
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
      <div
        className="relative rounded-[36px] pt-[72px] pb-[24px] px-[12px] z-10"
        style={{
          backgroundImage: 'url(/tutors/cover.svg)',
          backgroundSize: '100% 100%',
        }}
      >
        <div className="relative flex flex-col gap-[16px]">

          {/* Name */}
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

          {/* Quote */}
          {tutor.quote && (
            <p
              className="font-sans font-semibold text-cream text-center w-full"
              style={{ fontSize: 'clamp(24px, 1.6vw, 32px)', lineHeight: '1' }}
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
                {specializationsLabel}
              </p>
              <div className="flex flex-wrap gap-[4px] justify-center">
                {tutor.specializations.map(tag => (
                  <span
                    key={tag}
                    className="font-sans font-medium text-cream text-center rounded-[18px] px-[21px] py-[16px]"
                    style={{ backgroundColor: 'rgba(50,48,49,0.4)', fontSize: 'clamp(13px, 1.1vw, 17px)', lineHeight: '1.3' }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Desktop cursor-following button ── */}
      <div
        className="hidden lg:block absolute z-30 pointer-events-none"
        style={{
          left:      mousePos.x,
          top:       mousePos.y,
          transform: 'translate(-50%, -50%)',
          opacity:   hovered ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        <div
          className="bg-cream text-ink rounded-[66px] px-[20px] py-[10px] whitespace-nowrap font-sans font-bold"
          style={{ fontSize: '15px', lineHeight: '1', boxShadow: 'var(--shadow-btn)' }}
        >
          {selectLabel}
        </div>
      </div>

      {/* ── Mobile tap highlight overlay ── */}
      <div
        className="lg:hidden absolute inset-0 rounded-[36px] z-20 pointer-events-none bg-white/10"
        style={{ opacity: 0, transition: 'opacity 0.1s' }}
      />

    </div>
  )
}

// ─── Carousel ────────────────────────────────────────────────────────────────

const CARD_W = 'min(78vw, 370px)'

function TutorCarousel({
  tutors,
  specializationsLabel,
  selectLabel,
  onSelectTutor,
}: {
  tutors: Tutor[]
  specializationsLabel: string
  selectLabel: string
  onSelectTutor: (tutor: Tutor) => void
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    const center = el.scrollLeft + el.clientWidth / 2
    const cards = Array.from(el.children) as HTMLElement[]
    let closest = 0, minDist = Infinity
    cards.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setActiveIndex(closest)
  }

  const scrollToIndex = (i: number) => {
    const el = ref.current
    if (!el) return
    const cards = Array.from(el.children) as HTMLElement[]
    const card = cards[i]
    if (!card) return
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }

  return (
    <div className="flex flex-col gap-6 -mx-6">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex items-center overflow-x-auto snap-x snap-mandatory gap-[12px] px-6"
        style={{ scrollbarWidth: 'none', scrollPaddingInline: '24px' }}
      >
        {tutors.map((tutor, i) => (
          <div
            key={tutor.id}
            className="snap-center shrink-0"
            style={{ width: CARD_W }}
          >
            <TutorCard
              tutor={tutor}
              specializationsLabel={specializationsLabel}
              selectLabel={selectLabel}
              onSelect={() => onSelectTutor(tutor)}
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex justify-center items-center gap-[6px]">
        {tutors.map((_, i) => {
          const dist = Math.abs(i - activeIndex)
          if (dist > 2) return null
          return (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              aria-label={`Репетитор ${i + 1}`}
              style={{
                width:           dist === 0 ? 20 : dist === 1 ? 8 : 6,
                height:          dist === 0 ? 8 : dist === 1 ? 8 : 6,
                borderRadius:    4,
                backgroundColor: '#323031',
                opacity:         dist === 0 ? 1 : dist === 1 ? 0.45 : 0.2,
                transition:      'all 0.3s ease',
                border:          'none',
                cursor:          dist === 0 ? 'default' : 'pointer',
                padding:         0,
                flexShrink:      0,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TutorsSectionProps {
  data:         TutorsProps['data']
  tutors:       Tutor[]
  locale:       Locale
  modalStrings: FreeLessonModalStrings
}

export default function Tutors({ data, tutors, locale, modalStrings }: TutorsSectionProps) {
  const specializationsLabel = data.specLabel
  const selectLabel          = data.selectLabel
  const displayTutors        = tutors.length > 0 ? tutors : getStubTutors(locale)

  const [modalOpen,     setModalOpen]     = useState(false)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)

  const openModal = (tutor: Tutor | null) => {
    setSelectedTutor(tutor)
    setModalOpen(true)
  }

  return (
    <section id="tutors" className="w-full scroll-mt-[136px] lg:scroll-mt-[147px]">
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
            className="font-heading font-bold text-ink flex-1 text-right"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
          >
            {data.heading2}
          </h2>
        </div>

        {/* ══ Cards — carousel ══ */}
        <TutorCarousel
          tutors={displayTutors}
          specializationsLabel={specializationsLabel}
          selectLabel={selectLabel}
          onSelectTutor={tutor => openModal(tutor)}
        />

        {/* ══ Description quote ══ */}
        <p
          className="font-accent font-bold text-ink text-center w-full uppercase"
          style={{ fontSize: 'clamp(24px, 1.2vw, 36px)', lineHeight: '1', letterSpacing: '0.02em' }}
        >
          &ldquo;{data.description}&rdquo;
        </p>

        {/* ══ CTA button — opens modal without pre-selected tutor ══ */}
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={() => openModal(null)}
            className="flex items-center justify-center rounded-[66px] px-[36px] w-full lg:w-auto lg:min-w-[400px] cursor-pointer"
            style={{
              backgroundColor: '#2b2a2b',
              paddingTop: '44px',
              paddingBottom: '44px',
              boxShadow: 'var(--shadow-btn)',
            }}
          >
            <span
              className="font-accent text-center text-cream"
              style={{ fontSize: 'clamp(24px, 1.2vw, 36px)', lineHeight: '32px' }}
            >
              {data.ctaText}
            </span>
          </button>
        </div>

      </div>

      {/* ══ Free lesson modal ══ */}
      <FreeLessonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        strings={modalStrings}
        locale={locale}
        initialTutor={selectedTutor}
        allTutors={displayTutors.map(t => ({
          id:       t.id,
          fullName: t.fullName,
          imageUrl: t.imageUrl,
        }))}
      />
    </section>
  )
}
