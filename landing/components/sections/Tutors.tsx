'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import { canOptimizeImage } from '@/lib/optimizableImage'
import type { TutorsProps, Locale } from '@/types'
import type { Tutor } from '@/lib/tutors'
import { getStubTutors } from '@/lib/tutorStubs'
import { uiLabels } from '@/lib/uiLabels'
import AdaptiveText, { AdaptiveDuotoneFilter } from '@/components/ui/AdaptiveText'
import { useAdaptiveDuotone, dimDuotone } from '@/components/ui/useAdaptiveDuotone'
import { BLUE } from '@/components/ui/useAdaptiveText'

// ─── Tutor card ──────────────────────────────────────────────────────────────

function TutorCard({
  tutor,
  specializationsLabel,
  selectLabel,
  selectedLabel,
  unselectedLabel,
  selected,
  justDeselected,
  onSelect,
}: {
  tutor: Tutor
  specializationsLabel: string
  selectLabel: string
  selectedLabel: string
  unselectedLabel: string
  selected: boolean
  justDeselected: boolean
  onSelect: () => void
}) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [tapPos,   setTapPos]   = useState({ x: 0, y: 0 })
  const [hovered,  setHovered]  = useState(false)

  // Card cover hue: amber when selected, green otherwise. Keep the frosted /80 base
  // plus solidify-on-hover/center; only the hue changes (transition-colors animates it).
  const coverClass = selected
    ? 'bg-[#f69137]/80 group-hover:bg-[#f69137] group-[.is-center]:bg-[#f69137]'
    : 'bg-[#8fd096]/80 group-hover:bg-[#8fd096] group-[.is-center]:bg-[#8fd096]'

  // Chip = the cursor button (desktop) and the tap chip (mobile). Colours/label by state.
  const chip = justDeselected
    ? { bg: '#f26434',            color: 'var(--color-cream)', label: unselectedLabel }
    : selected
    ? { bg: '#323031',            color: 'var(--color-cream)', label: selectedLabel }
    : { bg: 'var(--color-cream)', color: '#323031',           label: selectLabel }

  return (
    <button
      type="button"
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect()
        setTapPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        onSelect()
      }}
      data-tutor-card
      className="relative flex flex-col w-full max-w-[410px] mx-auto cursor-pointer select-none active:opacity-80 lg:active:opacity-100 transition-opacity bg-transparent border-0 p-0 text-left"
      // touch-action `manipulation`, НЕ `pan-x`: карточка — это то, во что реально
      // попадает палец, а `pan-x` разрешает начатому здесь касанию ТОЛЬКО
      // горизонтальный пан. Вертикальный свайп при этом не «проваливается» к
      // предку — страница не скроллится вообще, и юзер заперт в секции.
      // `manipulation` оставляет оба направления и pinch-zoom, убирая лишь
      // задержку double-tap-zoom (ради неё pan-x и ставили). Регрессия ловится
      // `npm run verify:carousel-scroll`.
      style={{ touchAction: 'manipulation', '--edge-h': 'calc(min(78vw, 370px) * 0.192)' } as CSSProperties}
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
        data-adaptive-cover={selected ? '#f69137' : '#8fd096'}
        className="group relative z-10 px-[12px] pb-[24px]"
        style={{ paddingTop: 'calc(var(--edge-h) + 16px)' }}
      >
        {/*
          Glass cover — frosted green panel masked to the cover silhouette so the
          blur follows the notch shape (not the rectangle). Fixed-height notched
          band on top + stretchy rounded body below; solidifies on hover / centre.
          Blur only on hover-capable devices (как .glass в globals.css): на
          телефонах backdrop-буферы element×DPR роняли вкладку; transition —
          только цвет, анимация радиуса блюра перефильтровывает буфер каждый кадр.
        */}
        <div
          aria-hidden
          className={`absolute inset-0 z-0 rounded-b-[36px] [@media(hover:hover)]:backdrop-blur-[4px] ${coverClass} transition-colors duration-[600ms] group-hover:backdrop-blur-none pointer-events-none`}
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

      {/* ── Desktop cursor-following chip: Select / Selected / Unselected ── */}
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
          className="rounded-[66px] px-[20px] py-[10px] whitespace-nowrap font-sans font-bold transition-colors"
          style={{ backgroundColor: chip.bg, color: chip.color, fontSize: '15px', lineHeight: '1', boxShadow: 'var(--shadow-btn)' }}
        >
          {chip.label}
        </div>
      </div>

      {/* ── Mobile tap chip: appears at the tap point, persists while selected ── */}
      <div
        className="lg:hidden absolute z-30 pointer-events-none"
        style={{
          left:      tapPos.x,
          top:       tapPos.y,
          transform: 'translate(-50%, -50%)',
          opacity:   (selected || justDeselected) ? 1 : 0,
          transition: 'opacity 0.15s ease',
        }}
      >
        <div
          className="rounded-[66px] px-[20px] py-[10px] whitespace-nowrap font-sans font-bold transition-colors"
          style={{ backgroundColor: chip.bg, color: chip.color, fontSize: '15px', lineHeight: '1', boxShadow: 'var(--shadow-btn)' }}
        >
          {chip.label}
        </div>
      </div>

    </button>
  )
}

// ─── Plans CTA leaf ──────────────────────────────────────────────────────────
// The monstera the header's «Тарифы» pill is painted with (`Flower - Plans` in the
// hand-off sheet, split out by `npm run gen:pill-art`). The CTA below wears the same
// leaf on the same orange ground, so the button and the section it jumps to read as
// one object.
//
// TWO leaves, one per end, each covering 48% of the button — and each at the size a
// single centred leaf had, so the art keeps its scale and only its framing changes. Height
// follows the file's own aspect, which at this size runs well past the top and bottom, and
// `overflow-hidden rounded-[44px]` shows a band through the middle. That is the intended
// reading: the pill crops the art, the art is not squashed to fit — the same deal the
// header plate makes with its plants.
//
// The numbers are MEASURED off the file, not eyeballed. `gen:pill-art` re-exports every
// decoration on a viewBox inflated by DECOR_BLEED with the art re-seated inside it, so the
// painted leaf occupies 10.3%…84.4% of this file's box, not all of it — the rest is bleed.
// 1/(0.844−0.103) = 135% is therefore the box width that paints a leaf exactly as wide as
// the button, and 48% of coverage is that leaf pushed out until only its apex half is left
// inside: 0.48 − 0.897 × 135% = −73.05%, the mirror image of it on the other end. What
// hangs past is cropped by the pill's own outline, so there is no cut edge anywhere — the
// two leaves simply meet, apex to apex, over a 4% seam of orange at the centre.
const LEAF_SRC = '/SVG/header/pills/parts/plans-mid.svg'
const LEAF_BOX = {
  left:  'w-[135%] left-[-73.05%]',
  right: 'w-[135%] right-[-73.05%]',
} as const

// Growth only, no lean: the header's outer pair converges because it stands at the ends of
// a pill with the label between them, and these two already meet at the centre — 1.06 on a
// leaf this size is worth 32px, half of it inward, which closes the seam on its own. Same
// `.pill-decor` timing as the header, smaller number than its 1.15: there that is 20px
// inside a 133px pill, here the leaf is four times that and 1.15 spends 80px closing the
// last of the orange, so the button reads as turning olive rather than as a leaf growing.
// Spelled out in full: Tailwind reads class names literally and generates nothing for an
// assembled one.
const LEAF_MOTION = 'pill-decor motion-safe:group-hover/pill:scale-[1.06]'

function PlansLeaf({ side }: { side: 'left' | 'right' }) {
  return (
    // The wrapper carries the centring, the <img> carries the bloom. Both would otherwise
    // land on the same element, and they do not compose: `translate` is applied outside
    // `scale`, so a -50% centring offset would itself be scaled by the hover and the leaf
    // would jump ~18px up as it grew. Split in two, the wrapper never scales.
    //
    // Its height comes from the image (`h-auto` on an <img> with a viewBox = the file's
    // own ratio), and -translate-y-1/2 is therefore half of whatever that works out to —
    // no need to know the button's width to centre against it.
    <span
      aria-hidden
      className={`${LEAF_BOX[side]} pointer-events-none absolute top-1/2 -translate-y-1/2 select-none`}
    >
      <img
        src={LEAF_SRC}
        alt=""
        className={`${LEAF_MOTION} block w-full h-auto max-w-none`}
        // The file is drawn apex-left, petiole-right, so the LEFT leaf is the flipped one:
        // that points both apexes at the centre and sends both petioles off the ends. Left
        // unflipped it lays a stem across the label, which is what the first pass did.
        // The mirror rides `transform` and the bloom rides `scale` — separate properties,
        // so the hover grows the leaf without cancelling the flip.
        style={side === 'left' ? { transform: 'scaleX(-1)' } : undefined}
      />
    </span>
  )
}

// ─── Carousel dots ───────────────────────────────────────────────────────────

// Geometry per distance from the active card: the active one is a wide pill, the
// neighbours are round and dimmer, everything past ±2 is dropped.
const DOTS = [
  { w: 20, h: 8, alpha: 1    },
  { w:  8, h: 8, alpha: 0.45 },
  { w:  6, h: 6, alpha: 0.2  },
] as const

// The indicator adapts to the background like the headings do (AdaptiveText): where the
// engine can sample the live collage, each dot goes TRANSPARENT and its own rounded box
// carries the duotone backdrop — blue over a light scene, light green over a dark
// one. Without it the dots are flat and simply vanish where Tutors crosses the dark
// cliff/ocean. No mask is involved (the border-radius clips the backdrop), so this path
// also runs on iOS, unlike the image-masked adaptive icons. Fallback = flat blue.
// NB touch: the built-in chain (BACKDROP_BUILTIN) can only land on near-white/near-black,
// so phones still get a grayscale dot — no built-in filter sequence can tint one side.
function CarouselDots({
  count,
  activeIndex,
  onPick,
}: {
  count: number
  activeIndex: number
  onPick: (i: number) => void
}) {
  const duotone = useAdaptiveDuotone()

  return (
    <>
      {/* Only needed for the desktop chain (url(#adaptive-duotone-blue) — BACKDROP and
          this default must name the SAME palette); out of flow, no gap in the row below. */}
      {duotone?.includes('url(') && <AdaptiveDuotoneFilter />}

      <div className="flex justify-center items-center gap-[6px]">
        {Array.from({ length: count }, (_, i) => {
          const dist = Math.abs(i - activeIndex)
          if (dist > 2) return null
          const dot = DOTS[dist]
          const chain = duotone ? dimDuotone(duotone, dot.alpha) : undefined
          return (
            <button
              key={i}
              onClick={() => onPick(i)}
              aria-label={`Тутор ${i + 1}`}
              // Stable handle for npm run verify:tutor-dots (asserts the dots still paint
              // a duotone instead of an invisible transparent box).
              data-tutor-dot={dist}
              style={{
                width:           dot.w,
                height:          dot.h,
                borderRadius:    4,
                // Duotone mode paints the sampled backdrop, so the box must be empty and
                // the dim has to live INSIDE the chain — element opacity would regroup the
                // box and leak past the radius clip (see dimDuotone).
                backgroundColor: duotone ? 'transparent' : BLUE,
                opacity:         duotone ? 1 : dot.alpha,
                backdropFilter:       chain,
                WebkitBackdropFilter: chain,
                // Explicit list, not `all`: `all` would also animate backdrop-filter, and
                // re-filtering the backdrop buffer every frame is what we avoid elsewhere.
                transition:      'width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
                border:          'none',
                cursor:          dist === 0 ? 'default' : 'pointer',
                padding:         0,
                flexShrink:      0,
              }}
            />
          )
        })}
      </div>
    </>
  )
}

// ─── Carousel ────────────────────────────────────────────────────────────────

const CARD_W = 'min(78vw, 370px)'

function TutorCarousel({
  tutors,
  specializationsLabel,
  selectLabel,
  selectedLabel,
  unselectedLabel,
  selectedTutorId,
  justDeselectedId,
  onSelectTutor,
}: {
  tutors: Tutor[]
  specializationsLabel: string
  selectLabel: string
  selectedLabel: string
  unselectedLabel: string
  selectedTutorId: number | null
  justDeselectedId: number | null
  onSelectTutor: (tutorId: number) => void
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
        data-tutor-carousel
        className="flex items-center overflow-x-auto overflow-y-hidden snap-x snap-mandatory gap-[12px] py-[20px] -my-[20px] pl-6 lg:pl-[100px] pr-6 lg:pr-[100px]"
        // Без touch-action: браузер сам лочит ось по началу жеста — горизонталь уходит
        // в этот скроллер, вертикаль чейнится странице (вертикального overflow здесь нет).
        // `pan-x` тут уже стоял, ломал вертикальный скролл на iOS и был снят в a9e0b44 —
        // не возвращать.
        style={{ scrollbarWidth: 'none' }}
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
              selectedLabel={selectedLabel}
              unselectedLabel={unselectedLabel}
              selected={tutor.id === selectedTutorId}
              justDeselected={tutor.id === justDeselectedId}
              onSelect={() => onSelectTutor(tutor.id)}
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      <CarouselDots count={tutors.length} activeIndex={activeIndex} onPick={scrollToIndex} />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TutorsSectionProps {
  data:   TutorsProps['data']
  tutors: Tutor[]
  locale: Locale
}

export default function Tutors({ data, tutors, locale }: TutorsSectionProps) {
  const specializationsLabel = data.specLabel
  const selectLabel          = data.selectLabel
  const L                    = uiLabels(locale)
  const displayTutors        = tutors.length > 0 ? tutors : getStubTutors(locale)

  const [selectedTutorId,  setSelectedTutorId]  = useState<number | null>(null)
  const [justDeselectedId, setJustDeselectedId] = useState<number | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flashDeselect = (id: number) => {
    setJustDeselectedId(id)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setJustDeselectedId(null), 600)
  }

  const selectTutor = (tutorId: number) => {
    const next = selectedTutorId === tutorId ? null : tutorId // same-card re-click → deselect
    setSelectedTutorId(next)
    if (next === null) flashDeselect(tutorId)     // deselect → red "Unselected" flash
    else               setJustDeselectedId(null)  // select / switch → no flash
    window.dispatchEvent(new CustomEvent('tutor-selected', { detail: next }))
  }

  // Two-way sync: footer selection updates the highlight. Only clear the flash on a
  // real (non-null) id, so our own deselect dispatch doesn't wipe the red feedback.
  useEffect(() => {
    const onTutorSelected = (e: Event) => {
      const id = (e as CustomEvent<number | null>).detail
      setSelectedTutorId(id)
      if (id != null) setJustDeselectedId(null)
    }
    window.addEventListener('tutor-selected', onTutorSelected)
    return () => window.removeEventListener('tutor-selected', onTutorSelected)
  }, [])

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current) }, [])

  return (
    <section id="tutors" className="w-full scroll-mt-[136px] lg:scroll-mt-[164px]">
      <div className="flex flex-col gap-[64px] lg:gap-[80px] max-w-[1720px] mx-auto w-full">

        {/* ══ Headings row ══ */}
        {/* staticFill: these sit in the collage↔beach raise band, where the LIVE extracted
            sprites (roads/bushes, slid + swaying) no longer match the baked fill art, so
            the layered static fill lands on the wrong duotone side. Since phones went back
            to live sampling (see the engine gate in useAdaptiveText) this only applies
            under reduced-motion and ?staticfill — the backdrop ignores it and reads the
            LIGHT side here at every verified width (390/1440). "ink" names that light side
            of whatever palette is active — now blue. */}
        <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[48px] items-start w-full">
          <AdaptiveText
            as="h2"
            className="font-heading font-bold flex-1"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
            staticFill="ink"
          >
            {data.heading1}
          </AdaptiveText>
          <AdaptiveText
            as="h2"
            className="font-heading font-bold flex-1 text-right"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
            staticFill="ink"
          >
            {data.heading2}
          </AdaptiveText>
        </div>

        {/* ══ Cards — carousel ══ */}
        <TutorCarousel
          tutors={displayTutors}
          specializationsLabel={specializationsLabel}
          selectLabel={selectLabel}
          selectedLabel={L.selected}
          unselectedLabel={L.unselected}
          selectedTutorId={selectedTutorId}
          justDeselectedId={justDeselectedId}
          onSelectTutor={selectTutor}
        />

        {/* ══ Description quote ══ */}
        <AdaptiveText
          as="p"
          className="font-accent font-bold text-center w-full uppercase"
          style={{ fontSize: 'clamp(24px, 1.2vw, 36px)', lineHeight: '1', letterSpacing: '0.02em' }}
        >
          &ldquo;{data.description}&rdquo;
        </AdaptiveText>

        {/* ══ CTA button — jumps to Plans (радиус в тон паспорту в CELPE-BRAS) ══
            Wears the destination's own skin: the orange ground and the monstera of the
            header's «Тарифы» pill (NAV_PILL_STYLES / PillArt in Header.tsx). `group/pill`
            is NAMED — an unnamed group would be matched by any `.group` ancestor, and the
            tutor cards on this page are one. */}
        <div className="flex justify-center w-full">
          <a
            href="#plans"
            className="group/pill btn-press relative overflow-hidden flex items-center justify-center rounded-[44px] px-[36px] w-full lg:w-auto lg:min-w-[400px]"
            style={{
              backgroundColor: 'var(--color-orange)',
              paddingTop: '44px',
              paddingBottom: '44px',
              boxShadow: 'var(--shadow-btn)',
            }}
          >
            <PlansLeaf side="left" />
            <PlansLeaf side="right" />
            <span
              className="relative font-accent text-center text-cream"
              style={{ fontSize: 'clamp(24px, 1.2vw, 36px)', lineHeight: '1', letterSpacing: '0.1em'}}
            >
              {L.selectPlan}
            </span>
          </a>
        </div>

      </div>
    </section>
  )
}
