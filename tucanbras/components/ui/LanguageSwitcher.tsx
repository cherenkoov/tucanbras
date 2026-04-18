'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import type { Locale } from '@/types'

const LOCALES: { code: Locale; label: string; flagUrl: string }[] = [
  { code: 'en', label: 'EN', flagUrl: '/flags/usa.png'    },
  { code: 'pt', label: 'PT', flagUrl: '/flags/brazil.png' },
  { code: 'ru', label: 'RU', flagUrl: '/flags/russia.png' },
]

// Shared pill geometry — matches desktop NavPill
const PILL_STYLE = {
  backgroundColor: 'var(--color-ink)',
  color:           'var(--color-cream)',
  boxShadow:       'var(--shadow-round-inner)',
  fontSize:        'clamp(14px, 1.35vw, 26px)',
  lineHeight:      '32px',
  paddingTop:      '8px',
  paddingBottom:   '8px',
  paddingLeft:     'clamp(8px, 0.83vw, 16px)',
  paddingRight:    'clamp(8px, 0.83vw, 16px)',
} as const

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
  if (variant === 'pill') {
    // ── row: all flags in one horizontal line, others slide in from the right ─
    if (dropDirection === 'row') {
      return (
        <div
          ref={ref}
          className={`flex flex-row items-center gap-2 shrink-0 ${className ?? ''}`}
          style={style}
        >
          {others.map((l, i) => (
            <div
              key={l.code}
              style={{
                maxWidth:   open ? '60px' : '0px',
                opacity:    open ? 1 : 0,
                overflow:   'hidden',
                transition: 'max-width 200ms ease, opacity 200ms ease',
                transitionDelay: open ? `${i * 50}ms` : '0ms',
                flexShrink: 0,
              }}
            >
              <Link
                href={switchPath(l.code)}
                role="option"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none"
                style={{ ...PILL_STYLE, boxShadow: 'var(--shadow-pill-float)', pointerEvents: open ? 'auto' : 'none' }}
              >
                <img src={l.flagUrl} alt={l.label} style={{ height: '32px', width: 'auto', display: 'block' }} />
              </Link>
            </div>
          ))}

          {/* Current locale — always rightmost */}
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="relative flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none shrink-0"
            style={PILL_STYLE}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <img src={current.flagUrl} alt={current.label} style={{ height: '32px', width: 'auto', display: 'block' }} />
          </button>
        </div>
      )
    }

    // ── down: absolute dropdown below button (default, desktop) ───────────────
    return (
      <div
        ref={ref}
        className={`relative shrink-0 ${className ?? ''}`}
        style={style}
      >
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="relative flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none"
          style={PILL_STYLE}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <img src={current.flagUrl} alt={current.label} style={{ height: '32px', width: 'auto', display: 'block' }} />
        </button>

        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full mt-2 flex flex-col gap-2 z-[60]"
          style={{ pointerEvents: open ? 'auto' : 'none' }}
        >
          {others.map((l, i) => (
            <Link
              key={l.code}
              href={switchPath(l.code)}
              role="option"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none"
              style={{
                ...PILL_STYLE,
                boxShadow:       'var(--shadow-pill-float)',
                opacity:         open ? 1 : 0,
                transform:       open ? 'translateY(0)' : 'translateY(-10px)',
                transition:      'opacity 200ms ease, transform 200ms ease',
                transitionDelay: open ? `${i * 50}ms` : '0ms',
              }}
            >
              <img src={l.flagUrl} alt={l.label} style={{ height: '32px', width: 'auto', display: 'block' }} />
            </Link>
          ))}
        </div>
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
