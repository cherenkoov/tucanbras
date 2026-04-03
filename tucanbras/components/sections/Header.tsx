'use client'

import { useState, useEffect } from 'react'
import type { HeaderProps } from '@/types'

// Figma image asset URLs (valid ~7 days — replace with /public/images/header/* after download)
const IMG = {
  tucanBody:          'https://www.figma.com/api/mcp/asset/d1a605fe-4d02-4fa8-84c5-ab25557b8aaf',
  tucanTopHead:       'https://www.figma.com/api/mcp/asset/25f29a25-cb0e-4066-8665-725dfe070843',
  tucanNeak:          'https://www.figma.com/api/mcp/asset/51f159ea-b0b5-47f4-99a7-311edd3629b5',
  tucanEyeRight:      'https://www.figma.com/api/mcp/asset/594f7ec4-9155-40fd-aa94-9a4f72f2742e',
  tucanEyeLeft:       'https://www.figma.com/api/mcp/asset/53c8d0e7-c73b-4f8a-95ca-a96c58ebfdd9',
  tucanNoseMain:      'https://www.figma.com/api/mcp/asset/4e1bcac2-208c-4a7f-88de-35460b0a8204',
  tucanNoseMask:      'https://www.figma.com/api/mcp/asset/52c66ae0-d074-4f84-9d9e-666b646a729b',
  tucanNoseFill:      'https://www.figma.com/api/mcp/asset/e6dce2ef-eaa9-4918-9ec9-da85050b5159',
  tucanNose2Mask:     'https://www.figma.com/api/mcp/asset/fd9b49a1-e599-44c2-a16e-b9ea07887049',
  tucanNose2Fill:     'https://www.figma.com/api/mcp/asset/b3ba750d-8042-42b1-8b76-179dc98b3172',
  tucanTipDot:        'https://www.figma.com/api/mcp/asset/5e3c3e65-d104-4657-b8ae-baacb0a3e2d7',
  tucanRim:           'https://www.figma.com/api/mcp/asset/cf4f9d06-04f9-4705-9fa0-225d612c378a',
} as const

// Nav pill colors — index-matched to NAV_LINKS order, uses CSS tokens from globals.css
const NAV_PILL_STYLES = [
  { bg: 'var(--color-green)',  text: 'var(--color-ink)'   }, // О тукане
  { bg: 'var(--color-yellow)', text: 'var(--color-ink)'   }, // Репетиторы
  { bg: 'var(--color-blue)',   text: 'var(--color-cream)' }, // CELPE-BRAS
  { bg: 'var(--color-orange)', text: 'var(--color-cream)' }, // Тарифы
] as const

// Navigation items — hardcoded per CLAUDE.md, labels and anchors are fixed
export const NAV_LINKS = [
  { label: 'О тукане',   href: '#about'     },
  { label: 'Репетиторы', href: '#tutors'    },
  { label: 'CELPE-BRAS', href: '#celpe-bras' },
  { label: 'Тарифы',     href: '#plans'     },
]

// Inner shadow overlay used on nav pills (from Figma "Round Inner" effect → --shadow-round-inner)
const PILL_INNER_SHADOW = 'var(--shadow-round-inner)'

// ─── Tucan bird logo ─────────────────────────────────────────────────────────
// Multi-layer illustration from Figma node 2745:112407.
// Head Frame sits 35px above the Body Frame to create the "perching" effect.

function TucanLogo({ bodyW }: { bodyW: number }) {
  const scale = bodyW / 135
  const headW = Math.round(135 * scale)
  const headH = Math.round(174 * scale)
  const headTop = Math.round(-35 * scale)

  return (
    <div className="relative h-full shrink-0" style={{ width: bodyW }}>
      {/* Body Frame — clipped to header bar height by overflow-hidden */}
      <div className="absolute inset-0 overflow-hidden" style={{ left: '1.32%' }}>
        <img alt="" src={IMG.tucanBody} className="absolute block w-full h-full max-w-none" />
      </div>

      {/* Head Frame — пропорционально масштабируется от bodyW */}
      <div className="absolute" style={{ width: headW, height: headH, left: -4, top: headTop }}>

        {/* Top of head */}
        <div className="absolute" style={{ top: '-0.13%', right: '19.42%', bottom: '62.81%', left: '16.75%' }}>
          <img alt="" src={IMG.tucanTopHead} className="absolute block w-full h-full max-w-none" />
        </div>

        {/* Beak — slightly skewed */}
        <div className="absolute flex items-center justify-center"
          style={{ top: '12.34%', right: '25.1%', bottom: '48.92%', left: '10.05%' }}>
          <div style={{ width: 85.317 * scale, height: 64 * scale, transform: 'skewX(1.89deg)', position: 'relative' }}>
            <img alt="" src={IMG.tucanNeak} className="absolute block w-full h-full max-w-none" />
          </div>

        </div>

        {/* Eye right */}
        <div className="absolute" style={{ top: '17.33%', right: '18.87%', bottom: '70.54%', left: '68.07%' }}>
          <img alt="" src={IMG.tucanEyeRight} className="absolute block w-full h-full max-w-none" />
        </div>

        {/* Eye left */}
        <div className="absolute" style={{ top: '3.79%', right: '37.26%', bottom: '82.03%', left: '39.94%' }}>
          <img alt="" src={IMG.tucanEyeLeft} className="absolute block w-full h-full max-w-none" />
        </div>

        {/* Nose main shape */}
        <div className="absolute" style={{ top: '10.07%', right: '20.51%', bottom: '10.24%', left: '13.9%' }}>
          <img alt="" src={IMG.tucanNoseMain} className="absolute block w-full h-full max-w-none" />
        </div>

        {/* Nose left-side colour layer (masked) */}
        <div className="absolute" style={{
          top: '9.96%', right: '20.45%', bottom: '10.35%', left: '13.96%',
          maskImage: `url('${IMG.tucanNoseMask}')`,
          WebkitMaskImage: `url('${IMG.tucanNoseMask}')`,
          maskSize: `${69.502 * scale}px ${164.298 * scale}px`,
          maskPosition: `${-25.228 * scale}px ${-10.664 * scale}px`,
          maskRepeat: 'no-repeat',
        }}>
          <img
            alt=""
            src={IMG.tucanNoseFill}
            className="absolute block w-full max-w-none"
            style={{ height: `${Math.round((82 / 80) * bodyW)}px` }}
          />
        </div>

        {/* Nose right-side colour layer (masked) */}
        <div className="absolute" style={{
          top: '10.12%', right: '20.52%', bottom: '10.19%', left: '13.89%',
          maskImage: `url('${IMG.tucanNose2Mask}')`,
          WebkitMaskImage: `url('${IMG.tucanNose2Mask}')`,
          maskSize: `${115.663 * scale}px ${150.713 * scale}px`,
          maskPosition: `${-5.8 * scale}px ${-6.098 * scale}px`,
          maskRepeat: 'no-repeat',
        }}>
          <img alt="" src={IMG.tucanNose2Fill} className="absolute block w-full h-full max-w-none" />
        </div>

        {/* Tip dot */}
        <div className="absolute" style={{ top: '52.75%', right: '57.38%', bottom: '10.23%', left: '13.9%' }}>
          <img alt="" src={IMG.tucanTipDot} className="absolute block w-full h-full max-w-none" />
        </div>

        {/* Rim highlight */}
        <div className="absolute" style={{ top: '8.05%', right: '20.03%', bottom: '64.13%', left: '36.16%' }}>
          <img alt="" src={IMG.tucanRim} className="absolute block w-full h-full max-w-none" />
        </div>
      </div>
    </div>
  )
}

// ─── Desktop nav pills ────────────────────────────────────────────────────────

function NavPill({ label, href, bg, text }: {
  label: string
  href: string
  bg: string
  text: string
}) {
  return (
    <a
      href={href}
      className="relative flex items-center justify-center overflow-hidden rounded-btn min-w-[50px] font-semibold whitespace-nowrap select-none"
      style={{
        backgroundColor: bg,
        color: text,
        boxShadow: PILL_INNER_SHADOW,
        fontSize: 'clamp(14px, 1.35vw, 26px)',
        lineHeight: '32px',
        paddingTop: '8px',
        paddingBottom: '8px',
        paddingLeft: 'clamp(8px, 0.83vw, 16px)',
        paddingRight: 'clamp(8px, 0.83vw, 16px)',
      }}
    >
      {label}
    </a>
  )
}

// ─── Header component ─────────────────────────────────────────────────────────

export default function Header({ navLinks }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.classList.remove('menu-open')
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    // overflow-visible lets the tucan head peek above the bar
    <header id="header" className="relative z-50 w-full overflow-visible">

      {/* ── Main bar ── */}
      <div className="relative h-[85px] lg:h-[96px] max-w-[1720px] mx-auto overflow-visible">

        {/* Background plate — mobile: простой прямоугольник с radius-card */}
        <div
          aria-hidden
          className="lg:hidden absolute inset-0 pointer-events-none bg-cream rounded-card"
          style={{ boxShadow: 'var(--shadow-card)' }}
        />

        {/* Background plate — desktop: inline SVG с кастомной формой */}
        <svg
          aria-hidden
          className="hidden lg:block absolute pointer-events-none select-none w-full"
          style={{ top: 0, left: 0, height: '100%', overflow: 'visible' }}
          viewBox="0 0 1728 120"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="header-bg-filter" x="0" y="0" width="1728" height="130" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="2"/>
              <feGaussianBlur stdDeviation="2"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset dy="4"/>
              <feGaussianBlur stdDeviation="2"/>
              <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
              <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"/>
              <feBlend mode="normal" in2="shape" result="effect2_innerShadow"/>
            </filter>
          </defs>
          <g opacity="0.99" filter="url(#header-bg-filter)">
            <path d="M4 30C4 14.536 16.536 2 32 2L756.869 2.00001L804.893 2.00002L1696 2.00001C1711.46 2.00001 1724 14.536 1724 30V59.4483C1724 74.9123 1711.46 87.4483 1696 87.4483H984.43C947.439 89.1205 967.761 105.772 941.058 118.084C938.054 119.469 934.712 120 931.405 120L32 120C16.536 120 4 107.464 4 92L4 30Z" fill="#FFFCE5"/>
          </g>
        </svg>

        {/* Content — padded so nothing touches the background edges */}
        <div className="relative flex items-center justify-between h-full px-0">

          {/* Brand — tucan bird + logotype, grouped left */}
          <div className="relative z-10 flex items-center gap-0 shrink-0 overflow-visible h-full">
            <div className="hidden min-[430px]:block lg:hidden h-full"><TucanLogo bodyW={80} /></div>
            <div className="hidden lg:block h-full"><TucanLogo bodyW={135} /></div>
            <span
              className="flex items-center justify-center font-bold tracking-normal select-none text-green font-accent pb-2 h-full w-full ml-3"
              style={{ fontSize: 'clamp(28px, 4.69vw, 90px)', lineHeight: '0.9' }}
            >
              TucanBRAS
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop nav */}
          <nav
            className="relative z-10 hidden lg:flex w-fit items-start justify-start gap-3 pt-3 pb-4 px-3 shrink-0 h-full"
            aria-label="Основная навигация"
          >
            {navLinks.map((link, i) => (
              <NavPill
                key={link.href}
                label={link.label}
                href={link.href}
                bg={NAV_PILL_STYLES[i]?.bg ?? 'var(--color-green)'}
                text={NAV_PILL_STYLES[i]?.text ?? 'var(--color-ink)'}
              />
            ))}
          </nav>

          {/* Mobile burger — collapse animation */}
          <button
            className="relative z-[51] lg:hidden flex flex-col gap-[6px] items-end shrink-0 mr-[12px]"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menuOpen}
          >
            <span className={`block h-[12px] w-[40px] rounded-xsm bg-green transition-all duration-300 ease-in-out origin-center ${menuOpen ? 'translate-y-[21px] rotate-45' : ''}`} />
            <span className={`block h-[18px] w-[48px] rounded-xsm bg-green transition-all duration-300 ease-in-out ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block h-[12px] w-[40px] rounded-xsm bg-green transition-all duration-300 ease-in-out origin-center ${menuOpen ? '-translate-y-[21px] -rotate-45' : ''}`} />
          </button>

        </div>
      </div>

      {/* ── Click-catcher — закрывает меню при клике на контент ── */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}

      {/* ── Floating pills — под хедером, без фона, 70% справа ── */}
      <div className="lg:hidden absolute top-full right-0 z-50 flex flex-col items-end gap-3 p-4 pointer-events-none">
        {navLinks.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className="relative flex items-center justify-center overflow-hidden rounded-btn py-[18px] px-s400 font-semibold text-[22px] leading-[28px] transition-all duration-300 pointer-events-auto"
            style={{
              backgroundColor: NAV_PILL_STYLES[i]?.bg ?? 'var(--color-green)',
              color: NAV_PILL_STYLES[i]?.text ?? 'var(--color-ink)',
              boxShadow: 'var(--shadow-pill-float)',
              transitionDelay: menuOpen ? `${i * 60}ms` : '0ms',
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </header>
  )
}
