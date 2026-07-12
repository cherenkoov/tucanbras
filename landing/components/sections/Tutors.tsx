'use client'

import { useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { canOptimizeImage } from '@/lib/optimizableImage'
import type { TutorsProps, Locale, FreeLessonModalStrings } from '@/types'
import type { Tutor } from '@/lib/tutors'
import { getStubTutors } from '@/lib/tutorStubs'
import FreeLessonModal from '@/components/ui/FreeLessonModal'
import AdaptiveText from '@/components/ui/AdaptiveText'

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
    <button
      type="button"
      onClick={onSelect}
      className="relative flex flex-col w-full max-w-[410px] mx-auto cursor-pointer select-none active:opacity-80 lg:active:opacity-100 transition-opacity bg-transparent border-0 p-0 text-left"
      style={{ touchAction: 'pan-x', '--edge-h': 'calc(min(78vw, 370px) * 0.192)' } as CSSProperties}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
    >

      {/*
        Photo — full-card-width layer so its mask shares the cover's coordinate
        space. Two mask layers: a solid gradient keeps the whole square above the
        overlap visible; cover-notch-cut.svg trims the bottom `--edge-h` strip
        along the cover's decorative top edge, so the avatar tucks into the notch
        and nothing bleeds under the cover.
      */}
      <div
        className="relative w-full z-20 pointer-events-none"
        style={{
          marginBottom: 'calc(-1 * var(--edge-h))',
          WebkitMaskImage: 'linear-gradient(#fff,#fff), url(/SVG/tutors/cover-notch-cut.svg)',
          maskImage: 'linear-gradient(#fff,#fff), url(/SVG/tutors/cover-notch-cut.svg)',
          // +1px overlap on the solid layer so it tucks under the notch mask —
          // prevents a sub-pixel transparent seam where the two mask regions meet
          // (same guard the glass cover below uses).
          WebkitMaskSize: '100% calc(100% - var(--edge-h) + 1px), 100% var(--edge-h)',
          maskSize: '100% calc(100% - var(--edge-h) + 1px), 100% var(--edge-h)',
          WebkitMaskPosition: 'top, bottom',
          maskPosition: 'top, bottom',
          WebkitMaskRepeat: 'no-repeat, no-repeat',
          maskRepeat: 'no-repeat, no-repeat',
        }}
      >
        <div className="flex justify-center">
          <div
            className="relative overflow-hidden rounded-[21px]"
            style={{ width: 'calc(100% - 80px)', maxWidth: '326px', aspectRatio: '1/1' }}
          >
            {tutor.imageUrl ? (
              <Image
                src={tutor.imageUrl}
                alt={tutor.fullName}
                fill
                sizes="(max-width: 767px) 80vw, 326px"
                unoptimized={!canOptimizeImage(tutor.imageUrl)}
                className="object-cover object-top pointer-events-none"
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
      </div>

      {/* Card body — content defines height; glass cover sits behind it */}
      <div
        data-glass-center
        className="group relative z-10 px-[12px] pb-[24px]"
        style={{ paddingTop: 'calc(var(--edge-h) + 16px)' }}
      >
        {/*
          Glass cover — frosted green panel masked to the cover silhouette so the
          blur follows the notch shape (not the rectangle). Fixed-height notched
          band on top + stretchy rounded body below; solidifies on hover / centre.
        */}
        <div
          aria-hidden
          className="absolute inset-0 z-0 rounded-b-[36px] backdrop-blur-[4px] bg-[#8fd096]/80 transition-all duration-[600ms] group-hover:backdrop-blur-none group-hover:bg-[#8fd096] group-[.is-center]:backdrop-blur-none group-[.is-center]:bg-[#8fd096] pointer-events-none"
          style={{
            WebkitMaskImage: 'url(/SVG/tutors/cover-edge.svg), linear-gradient(#fff,#fff)',
            maskImage: 'url(/SVG/tutors/cover-edge.svg), linear-gradient(#fff,#fff)',
            WebkitMaskSize: '100% var(--edge-h), 100% calc(100% - var(--edge-h) + 1px)',
            maskSize: '100% var(--edge-h), 100% calc(100% - var(--edge-h) + 1px)',
            WebkitMaskPosition: 'top, bottom',
            maskPosition: 'top, bottom',
            WebkitMaskRepeat: 'no-repeat, no-repeat',
            maskRepeat: 'no-repeat, no-repeat',
          }}
        />
        <div className="relative z-10 flex flex-col gap-[16px]">

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

    </button>
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
    <div className="flex flex-col gap-6 w-screen ml-[calc(-50vw+50%)]">
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex items-center overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-[12px] py-[20px] -my-[20px] pl-6 lg:pl-[100px] pr-6 lg:pr-[100px]"
        style={{ scrollbarWidth: 'none', touchAction: 'pan-x' }}
      >
        {tutors.map(tutor => (
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
          <AdaptiveText
            as="h2"
            className="font-heading font-bold flex-1"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
          >
            {data.heading1}
          </AdaptiveText>
          <AdaptiveText
            as="h2"
            className="font-heading font-bold flex-1 text-right"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
          >
            {data.heading2}
          </AdaptiveText>
        </div>

        {/* ══ Cards — carousel ══ */}
        <TutorCarousel
          tutors={displayTutors}
          specializationsLabel={specializationsLabel}
          selectLabel={selectLabel}
          onSelectTutor={tutor => openModal(tutor)}
        />

        {/* ══ Description quote ══ */}
        <AdaptiveText
          as="p"
          className="font-accent font-bold text-center w-full uppercase"
          style={{ fontSize: 'clamp(24px, 1.2vw, 36px)', lineHeight: '1', letterSpacing: '0.02em' }}
        >
          &ldquo;{data.description}&rdquo;
        </AdaptiveText>

        {/* ══ CTA button — opens modal without pre-selected tutor ══ */}
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={() => openModal(null)}
            className="flex items-center justify-center rounded-[66px] px-[36px] w-full lg:w-auto lg:min-w-[400px] cursor-pointer transition-transform duration-[120ms] ease-out hover:scale-[1.04] active:scale-[0.95]"
            style={{
              backgroundColor: '#2b2a2b',
              paddingTop: '44px',
              paddingBottom: '44px',
              boxShadow: 'var(--shadow-btn)',
            }}
          >
            <span
              className="font-accent text-center text-cream"
              style={{ fontSize: 'clamp(24px, 1.2vw, 36px)', lineHeight: '1', letterSpacing: '0.1em'}}
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
