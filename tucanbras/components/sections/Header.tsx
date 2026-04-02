'use client'

import { useState } from 'react'
import type { HeaderProps } from '@/types'

// Figma image asset URLs (valid ~7 days — replace with /public/images/header/* after download)
const IMG = {
  headerBgDesktop: 'https://www.figma.com/api/mcp/asset/2c035257-bd44-45a3-a0e3-9904f09c0229',
  headerBgMobile:  'https://www.figma.com/api/mcp/asset/2cd7ae23-23ad-4ff8-8de5-5d3a2c139eba',
  tucanBody:          'https://www.figma.com/api/mcp/asset/76321cbb-e4f7-483b-a975-549b14f4baf9',
  tucanTopHead:       'https://www.figma.com/api/mcp/asset/bb08f8dd-911d-4d80-8208-6f91bc75c9c9',
  tucanNeak:          'https://www.figma.com/api/mcp/asset/c6ca2ec3-51db-49c0-883e-a7db5be1c6a0',
  tucanEyeRight:      'https://www.figma.com/api/mcp/asset/669c2f7a-a693-4f9b-bd1c-ebca9df94860',
  tucanEyeLeft:       'https://www.figma.com/api/mcp/asset/d7c071bc-66a0-41fb-a586-849957247c29',
  tucanNoseMain:      'https://www.figma.com/api/mcp/asset/109d744c-542d-4260-8083-9b8534f0b6d2',
  tucanNoseGroupMask: 'https://www.figma.com/api/mcp/asset/dea3a0c8-7124-4e44-b391-424ab7995136',
  tucanNoseGroupFill: 'https://www.figma.com/api/mcp/asset/82981ed9-2817-48fc-bd33-994afdbe6013',
  tucanNose2Mask:     'https://www.figma.com/api/mcp/asset/26ec29aa-cc06-4c2d-b053-8beef8c82e71',
  tucanNose2Fill:     'https://www.figma.com/api/mcp/asset/2a725eed-fe91-46df-a0d4-8b28fd63f984',
  tucanTipDot:        'https://www.figma.com/api/mcp/asset/5bb5d4ab-eb45-496c-9a26-13f4fa4883ed',
  tucanRim:           'https://www.figma.com/api/mcp/asset/3c7b161a-222f-40f4-8012-2f25adeb9628',
} as const

// Nav pill colors — index-matched to NAV_LINKS order, hardcoded per Figma design tokens
const NAV_PILL_STYLES = [
  { bg: '#8fd096', text: '#323031' }, // О тукане
  { bg: '#ffd376', text: '#323031' }, // Репетиторы
  { bg: '#2e67b2', text: '#fffce5' }, // CELPE-BRAS
  { bg: '#f26434', text: '#fffce5' }, // Тарифы
] as const

// Navigation items — hardcoded per CLAUDE.md, labels and anchors are fixed
export const NAV_LINKS = [
  { label: 'О тукане',   href: '#about'     },
  { label: 'Репетиторы', href: '#tutors'    },
  { label: 'CELPE-BRAS', href: '#celpe-bras' },
  { label: 'Тарифы',     href: '#plans'     },
]

// Inner shadow overlay used on nav pills (from Figma "Round Inner" effect)
const PILL_INNER_SHADOW = '0 0 0 0 transparent, inset -4px 4px 8px rgba(0,0,0,.05), inset 4px -4px 8px rgba(0,0,0,.05), inset -4px -4px 8px rgba(0,0,0,.05), inset 4px 4px 8px rgba(0,0,0,.05)'

// ─── Tucan bird logo ─────────────────────────────────────────────────────────
// Multi-layer illustration assembled from Figma image assets.
// The Head Frame extends 35px above the container to create the "perching" effect.

function TucanLogo({ heightPx }: { heightPx: number }) {
  return (
    // Outer wrapper — overflow visible so the head can peek above the header bar
    <div className="relative shrink-0" style={{ width: 135, height: heightPx }}>
      {/* Body (fills container height) */}
      <div className="absolute inset-0" style={{ left: '1.32%' }}>
        <img alt="" src={IMG.tucanBody} className="w-full h-full object-contain" />
      </div>

      {/* Head Frame — positioned above the body */}
      <div className="absolute" style={{ width: 135, height: 174, left: -4, top: -35 }}>

        {/* Top of head */}
        <img alt="" src={IMG.tucanTopHead} className="absolute max-w-none"
          style={{ top: '-0.13%', right: '19.42%', bottom: '62.81%', left: '16.75%' }} />

        {/* Beak (neak) — slightly skewed */}
        <div className="absolute flex items-center justify-center"
          style={{ top: '12.34%', right: '25.1%', bottom: '48.92%', left: '10.05%' }}>
          <div style={{ width: 85.317, height: 67.432, transform: 'skewX(1.89deg)', position: 'relative' }}>
            <img alt="" src={IMG.tucanNeak} className="absolute w-full h-full" />
          </div>
        </div>

        {/* Eyes */}
        <img alt="" src={IMG.tucanEyeRight} className="absolute max-w-none"
          style={{ top: '17.33%', right: '18.87%', bottom: '70.54%', left: '68.07%' }} />
        <img alt="" src={IMG.tucanEyeLeft} className="absolute max-w-none"
          style={{ top: '3.79%', right: '37.26%', bottom: '82.03%', left: '39.94%' }} />

        {/* Nose — main shape */}
        <img alt="" src={IMG.tucanNoseMain} className="absolute max-w-none"
          style={{ top: '10.07%', right: '20.51%', bottom: '10.24%', left: '13.9%' }} />

        {/* Nose left-side colour layer (masked) */}
        <div className="absolute"
          style={{
            top: '9.96%', right: '20.45%', bottom: '10.35%', left: '13.96%',
            maskImage: `url('${IMG.tucanNoseGroupMask}')`,
            WebkitMaskImage: `url('${IMG.tucanNoseGroupMask}')`,
            maskSize: '69.502px 164.298px',
            maskPosition: '-25.227px -10.664px',
            maskRepeat: 'no-repeat',
          }}>
          <img alt="" src={IMG.tucanNoseGroupFill} className="w-full h-full" />
        </div>

        {/* Nose right-side colour layer (masked) */}
        <div className="absolute"
          style={{
            top: '10.12%', right: '20.52%', bottom: '10.19%', left: '13.89%',
            maskImage: `url('${IMG.tucanNose2Mask}')`,
            WebkitMaskImage: `url('${IMG.tucanNose2Mask}')`,
            maskSize: '115.664px 150.713px',
            maskPosition: '-5.799px -6.098px',
            maskRepeat: 'no-repeat',
          }}>
          <img alt="" src={IMG.tucanNose2Fill} className="w-full h-full" />
        </div>

        {/* Tip dot */}
        <img alt="" src={IMG.tucanTipDot} className="absolute max-w-none"
          style={{ top: '52.75%', right: '57.38%', bottom: '10.23%', left: '13.9%' }} />

        {/* Rim highlight */}
        <img alt="" src={IMG.tucanRim} className="absolute max-w-none"
          style={{ top: '8.05%', right: '20.03%', bottom: '64.13%', left: '36.16%' }} />
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
      className="relative flex items-center justify-center overflow-hidden rounded-[21px] py-[21px] px-[16px] min-w-[50px] font-semibold text-[26px] leading-[32px] whitespace-nowrap select-none"
      style={{ backgroundColor: bg, color: text, boxShadow: PILL_INNER_SHADOW }}
    >
      {label}
    </a>
  )
}

// ─── Header component ─────────────────────────────────────────────────────────

export default function Header({ navLinks }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    // overflow-visible lets the tucan head peek above the bar
    <header id="header" className="relative z-50 overflow-visible">

      {/* ── Main bar ── */}
      <div className="relative flex items-center justify-between h-[85px] lg:h-[118px] max-w-[1720px] mx-auto overflow-visible">

        {/* Background image — cream panel with rounded bottom */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Desktop */}
          <img
            alt=""
            src={IMG.headerBgDesktop}
            className="hidden lg:block absolute max-w-none w-full h-full object-fill"
            style={{ inset: '-1.69% -0.25% -5.08% -0.25%' }}
          />
          {/* Mobile */}
          <img
            alt=""
            src={IMG.headerBgMobile}
            className="block lg:hidden absolute max-w-none w-full h-full object-fill"
            style={{ inset: '-2.35% -1.56% -7.06% -1.56%' }}
          />
        </div>

        {/* Tucan logo */}
        <div className="relative shrink-0 overflow-visible">
          <TucanLogo heightPx={118} />
        </div>

        {/* Logotype — "Tucan.BRAS" */}
        <div className="flex flex-1 items-center min-w-0 pb-4">
          <span
            className="font-bold leading-[80px] text-[90px] tracking-normal select-none"
            style={{ color: '#8fd096', fontFamily: "'RimmaSans', 'Georgia', serif" }}
          >
            Tucan.BRAS
          </span>
        </div>

        {/* Desktop nav */}
        <nav
          className="hidden lg:flex items-start gap-3 pt-3 pb-4 px-3 shrink-0"
          aria-label="Основная навигация"
        >
          {navLinks.map((link, i) => (
            <NavPill
              key={link.href}
              label={link.label}
              href={link.href}
              bg={NAV_PILL_STYLES[i]?.bg ?? '#8fd096'}
              text={NAV_PILL_STYLES[i]?.text ?? '#323031'}
            />
          ))}
        </nav>

        {/* Mobile burger */}
        <button
          className="lg:hidden flex flex-col gap-[6px] items-end pr-3 shrink-0"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
        >
          <span className="block h-[12px] w-[40px] rounded-[4px]" style={{ backgroundColor: '#8fd096' }} />
          <span className="block h-[18px] w-[48px] rounded-[4px]" style={{ backgroundColor: '#8fd096' }} />
          <span className="block h-[12px] w-[40px] rounded-[4px]" style={{ backgroundColor: '#8fd096' }} />
        </button>
      </div>

      {/* ── Mobile dropdown menu ── */}
      {menuOpen && (
        <div className="lg:hidden flex flex-col gap-3 px-4 py-4 max-w-[1720px] mx-auto">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="relative flex items-center justify-center overflow-hidden rounded-[21px] py-[18px] px-4 w-full font-semibold text-[22px] leading-[28px] text-center"
              style={{
                backgroundColor: NAV_PILL_STYLES[i]?.bg ?? '#8fd096',
                color: NAV_PILL_STYLES[i]?.text ?? '#323031',
                boxShadow: PILL_INNER_SHADOW,
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  )
}
