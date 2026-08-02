'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import type { Locale } from '@/types'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { DECK, dealDelay, ICON_PILL_HOVER, PILL_H, PITCH, TIGHT_PITCH } from '@/components/ui/deckMotion'
import { DECOR_LAYER } from '@/components/ui/pillArt'

type LocaleEntry = { code: Locale; label: string; flagUrl: string; bloomUrl: string }

// `parts/` — the same plant on the wider window `gen:pill-art` writes, so it can
// grow out over the bar instead of into the edge of the button. See pillArt.ts.
const LOCALES: LocaleEntry[] = [
  { code: 'en', label: 'EN', flagUrl: '/SVG/flags/flag-en.svg', bloomUrl: '/SVG/flags/parts/bloom-en.svg' },
  { code: 'pt', label: 'PT', flagUrl: '/SVG/flags/flag-pt.svg', bloomUrl: '/SVG/flags/parts/bloom-pt.svg' },
  { code: 'ru', label: 'RU', flagUrl: '/SVG/flags/flag-ru.svg', bloomUrl: '/SVG/flags/parts/bloom-ru.svg' },
]

// Square flag pill — same height as desktop NavPill (PILL_H), but 1:1 aspect.
// Cream ground, so the plant behind the flag is the only dark thing on it.
const PILL_STYLE = {
  backgroundColor: 'var(--color-cream)',
  color:           'var(--color-ink)',
  boxShadow:       'var(--shadow-round-inner)',
  width:           `${PILL_H}px`,
  height:          `${PILL_H}px`,
} as const

// Where card `i` comes to rest, per direction. Sideways the cards are a row of
// equals, so every step is the tight one; downwards the first card clears the bar
// with the wide gap and the rest close up behind it — the rhythm the header's ⋮
// column borrows (see deckMotion).
const restingOffset = (i: number, row: boolean) =>
  row ? -(i + 1) * TIGHT_PITCH : PITCH + i * TIGHT_PITCH

/**
 * Transition for a card being dealt out of / tucked back into the deck.
 *
 * Two properties on two clocks. `transform` carries the deal — travel plus the
 * tuck scale — on the deck's timing. The hover press writes the separate `scale`
 * property, and it needs its own entry: on the deal's 340ms + stagger the press
 * would trail the cursor by a third of a second, and omitting it from the list
 * altogether (not the same as leaving it at the default) makes it snap.
 */
function dealMotion(i: number, count: number, open: boolean, still: boolean) {
  const ms   = still ? 0 : (open ? DECK.OUT_MS : DECK.IN_MS)
  const wait = still ? 0 : dealDelay(i, count, open)
  const ease = open ? DECK.OUT_EASE : DECK.IN_EASE
  return {
    transition: `transform ${ms}ms ${ease} ${wait}ms, scale ${still ? 0 : 120}ms ease-out`,
  } as const
}

// The 24px box is the button's own, not the mockup's — the pill keeps its size.
// The flag does NOT zoom: it is the pill's meaning, not its decoration, and it
// already grows with the button. Only the plant behind it moves on its own.
const FLAG_BOX = {
  width:     '24px',
  height:    '24px',
  objectFit: 'contain',
} as const

// Named group, not the bare `group`: on desktop these pills live inside the
// header bar, which is a `.group` of its own — an unnamed `group-hover:` matches
// ANY `.group` ancestor, so every flag would zoom the moment the cursor touched
// the bar. Kept identical to the nav pills' handle so both read as one system.
const PILL_GROUP = 'group/pill'

// The plant grows by the 1.15 every decoration in the header grows by, on
// `.pill-decor`'s timing — and out of the button, not into its edge: the layer
// is drawn on the bled window (DECOR_LAYER) and the button no longer clips.
// (Spelled out — Tailwind only generates class names it can read literally in
// the source; see the note in deckMotion.)
const BLOOM_ZOOM = 'pill-decor motion-safe:group-hover/pill:scale-[1.15]'

// Pill face per Figma (3381:70200): a botanical clipped by the pill sits behind
// the flag, one plant per locale. The art is authored in the mockup's 72×61 pill
// box and carries `preserveAspectRatio="slice"`, so the same proportional
// placement survives the square button — it crops, never squashes.
function PillFace({ locale }: { locale: LocaleEntry }) {
  return (
    <>
      <img
        src={locale.bloomUrl}
        alt=""
        aria-hidden
        className={`${DECOR_LAYER} ${BLOOM_ZOOM}`}
      />
      <img
        src={locale.flagUrl}
        alt={locale.label}
        style={FLAG_BOX}
        className="relative block"
      />
    </>
  )
}

interface Props {
  /** pill — dark button + dropdown (Header) | text — slash-separated links (Footer) */
  variant?: 'pill' | 'text'
  /** down — dropdown below button (desktop) | row — inline row to the left (mobile) */
  dropDirection?: 'down' | 'row'
  className?: string
  style?: React.CSSProperties
}

export default function LanguageSwitcher({ variant = 'text', dropDirection = 'down', className, style }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const currentLocale =
    LOCALES.find(
      l => pathname === `/${l.code}` || pathname.startsWith(`/${l.code}/`),
    )?.code ?? 'en'

  const current = LOCALES.find(l => l.code === currentLocale)!
  const others  = LOCALES.filter(l => l.code !== currentLocale)

  function switchPath(code: Locale): string {
    const rest = pathname.replace(/^\/(en|pt|ru)/, '')
    return `/${code}${rest}`
  }

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  // ── pill variant ────────────────────────────────────────────────────────────
  // One deck, two axes: sideways in the mobile burger column, downwards under the
  // desktop bar. Closed, every other locale sits in the exact box of the current
  // pill, one z-layer under it; open, the cards are dealt out from beneath it.
  // The block never changes size — the cards are absolute, so they fan out over
  // the page instead of pushing their neighbours around.
  if (variant === 'pill') {
    const row = dropDirection === 'row'
    const axis = (px: number) => (row ? `translateX(${px}px)` : `translateY(${px}px)`)

    return (
      <div
        ref={ref}
        className={`relative shrink-0 ${className ?? ''}`}
        style={{ ...style, width: PILL_H, height: PILL_H }}
      >
        <div role="listbox" aria-label="Select language" className="absolute inset-0 pointer-events-none">
          {others.map((l, i) => (
            <Link
              key={l.code}
              href={switchPath(l.code)}
              role="option"
              aria-selected={false}
              aria-hidden={!open}
              tabIndex={open ? 0 : -1}
              onClick={() => setOpen(false)}
              className={`${PILL_GROUP} absolute left-0 top-0 flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none cursor-pointer ${ICON_PILL_HOVER}`}
              style={{
                ...PILL_STYLE,
                boxShadow: 'var(--shadow-pill-float)',
                // Deeper in the deck = lower layer, so each card is drawn from
                // under the one that left before it.
                zIndex:    others.length - i,
                transform: open
                  ? `${axis(restingOffset(i, row))} scale(1)`
                  : `${axis(0)} scale(${DECK.TUCK_SCALE})`,
                ...dealMotion(i, others.length, open, reduceMotion),
                pointerEvents: open ? 'auto' : 'none',
              }}
            >
              <PillFace locale={l} />
            </Link>
          ))}
        </div>

        {/* Current locale — the top card: it never moves, and nothing is drawn over it */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={`${PILL_GROUP} relative flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none shrink-0 cursor-pointer transition-transform duration-[240ms] ease-out ${ICON_PILL_HOVER}`}
          style={{ ...PILL_STYLE, zIndex: others.length + 1 }}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <PillFace locale={current} />
        </button>
      </div>
    )
  }

  // ── text variant (Footer) ───────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-[6px] ${className ?? ''}`} style={style}>
      {LOCALES.map((l, i) => (
        <span key={l.code} className="flex items-center gap-[6px]">
          {i > 0 && (
            <span className="font-sans font-bold text-ink opacity-30 select-none">/</span>
          )}
          <Link
            href={switchPath(l.code)}
            className={`font-sans font-bold text-ink transition-opacity ${
              l.code === currentLocale
                ? 'underline opacity-100'
                : 'opacity-40 hover:opacity-80 no-underline'
            }`}
          >
            {l.label}
          </Link>
        </span>
      ))}
    </div>
  )
}
