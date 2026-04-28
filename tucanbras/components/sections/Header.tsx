'use client'

import { useState, useEffect, useRef } from 'react'
import type { HeaderProps } from '@/types'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'


// Nav pill colors — index-matched to NAV_LINKS order, uses CSS tokens from globals.css
const NAV_PILL_STYLES = [
  { bg: 'var(--color-green)',  text: 'var(--color-ink)'   }, // О тукане
  { bg: 'var(--color-yellow)', text: 'var(--color-ink)'   }, // Репетиторы
  { bg: 'var(--color-blue)',   text: 'var(--color-cream)' }, // CELPE-BRAS
  { bg: 'var(--color-orange)', text: 'var(--color-cream)' }, // Тарифы
] as const

// Anchor hrefs are hardcoded — labels come from Notion via page.tsx

// Inner shadow overlay used on nav pills (from Figma "Round Inner" effect → --shadow-round-inner)
const PILL_INNER_SHADOW = 'var(--shadow-round-inner)'

// Gap (px) at which the last 2 nav pills collapse into the ⋮ button
const COLLAPSE_GAP = 16

// ─── Tucan bird logo ─────────────────────────────────────────────────────────
// Two-layer approach matching the original design:
//   1. Body SVG  — clipped to header bar height via overflow-hidden
//   2. Head SVG  — overflows above the bar; head+beak all animated together
//
// Path assignments (from Tucan Container.svg):
//   BODY  → dark silhouette only  (M139 134.77…)
//   HEAD  → everything else: head feathers, face, eyes, + all 5 beak parts:
//            Main (#F79138), Left side (#D05427 masked), Right side (#F47530 masked),
//            Tip dot (opacity 0.64 #25292B), Rim (#282B2E)

function TucanLogo({ bodyW }: { bodyW: number }) {
  const scale = bodyW / 139
  const svgH  = Math.round(175 * scale)
  const top   = Math.round(-35 * scale)

  const svgProps = {
    width: bodyW,
    height: svgH,
    viewBox: '0 0 139 175',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
  } as const

  return (
    <div className="relative h-full shrink-0 overflow-visible" style={{ width: bodyW }}>

      {/* ── 1. Body — clipped to header bar height ── */}
      <div className="absolute inset-0 overflow-hidden">
        <svg aria-hidden {...svgProps} className="absolute" style={{ left: 0, top }}>
          <path d="M139 134.77C139 134.77 132.54 2.17215 27.5174 43.0428C27.3052 42.7794 -8.58012 77.0481 12.3214 112.373C14.0828 115.351 16.1738 119.132 20.943 121.218L20.7488 117.739C20.7488 117.739 21.0153 119.541 22.0902 119.851C23.1651 120.16 22.7631 120.411 23.4993 120.721C24.2354 121.03 24.0367 119.044 24.9761 120.223C25.9155 121.402 45.0683 121.944 47.5207 153.221H139V134.77Z" fill="#25292B"/>
        </svg>
      </div>

      {/* ── 2. Head + all beak parts — animated, overflows above bar ── */}
      <svg aria-hidden {...svgProps} className="absolute" style={{ left: -4, top, overflow: 'visible' }}>
        <style>{`
          @keyframes tucan-bob {
            0%,100% { transform: rotate(0deg); }
            25%      { transform: rotate(-5deg); }
            75%      { transform: rotate(4deg); }
          }
        `}</style>

        <g style={{ transformOrigin: '57px 89px', animation: 'tucan-bob 5s ease-in-out infinite' }}>

          {/* Head — top feathers (bottom layer) */}
          <path d="M22.6182 47.3015C22.6182 47.3015 41.0355 -1.82855 80.4567 0.0526785C119.878 1.93818 106.643 36.2621 106.643 36.2621L95.5653 64.9337L22.6182 47.3015Z" fill="#282B2E"/>

          {/* Head — face oval */}
          <path d="M58.4549 89.0924C82.0145 89.0924 100.615 74.0055 100 55.3948C99.3856 36.7842 79.7884 21.6973 56.2288 21.6973C32.6692 21.6973 14.0686 36.7842 14.6834 55.3948C15.2981 74.0055 34.8953 89.0924 58.4549 89.0924Z" fill="#FEF1CA"/>

          {/* Head — right eye ring */}
          <path d="M107.386 42.2907C108.569 37.215 106.539 32.4907 102.853 31.7387C99.166 30.9866 95.2183 34.4917 94.0354 39.5674C92.8525 44.6431 94.8822 49.3675 98.569 50.1195C102.256 50.8715 106.203 47.3665 107.386 42.2907Z" fill="#D55C27"/>

          {/* Head — upper beak outline on face */}
          <path d="M56.1808 31.4791C56.1808 31.4791 49.4217 24.4628 59.2519 12.0422C69.0866 -0.378453 84.6979 15.8389 84.6979 15.8389L56.1762 31.4791H56.1808Z" fill="#F79235"/>

          {/* Head — beak ridge */}
          <path d="M67.3212 18.9786C70.059 14.7988 70.4833 10.3813 68.2688 9.11172C66.0544 7.84216 62.0398 10.2013 59.302 14.3811C56.5642 18.5609 56.1399 22.9784 58.3544 24.248C60.5688 25.5175 64.5834 23.1584 67.3212 18.9786Z" fill="#D55C27"/>

          {/* Eye — iris */}
          <path d="M66.7526 19.8412C69.1686 16.1527 69.5431 12.2544 67.5891 11.1341C65.635 10.0138 62.0924 12.0958 59.6763 15.7843C57.2603 19.4728 56.8858 23.3711 58.8399 24.4913C60.794 25.6116 64.3366 23.5297 66.7526 19.8412Z" fill="#3166B1"/>

          {/* Eye — pupil */}
          <path d="M60.6045 16.2563C58.8496 18.9371 58.8725 21.8232 60.5268 22.8878C62.9581 24.4527 65.0512 22.4944 66.8061 19.8136C68.561 17.1328 69.4247 14.2596 66.8838 13.1822C65.0557 12.4083 62.3594 13.5755 60.6045 16.2563Z" fill="#1E1617"/>

          {/* Eye — highlight */}
          <path d="M62.5848 17.4321C62.8284 17.0374 62.753 16.5701 62.4163 16.3882C62.0797 16.2064 61.6094 16.379 61.3658 16.7737C61.1223 17.1683 61.1977 17.6357 61.5343 17.8175C61.8709 17.9993 62.3413 17.8268 62.5848 17.4321Z" fill="#FBFADF"/>

          {/* Eye — brow detail */}
          <path d="M63.7658 15.646C63.7658 15.646 65.2465 13.7348 66.6678 13.9443C66.6678 13.9443 66.1194 13.1276 64.6113 13.8074C63.1032 14.4873 61.9195 15.5519 62.6005 15.9795C63.2814 16.407 63.7704 15.646 63.7704 15.646H63.7658Z" fill="#FBFADF"/>

          {/* Beak — Main (above face oval) */}
          <path d="M49.4826 60.8447L51.3609 48.5227C51.3609 48.5227 52.1332 39.4714 59.4224 31.4676C66.7116 23.4638 82.8393 18.3503 82.8393 18.3503C82.8393 18.3503 93.844 16.3152 100.649 19.727C107.449 23.1389 107.307 28.7783 107.307 28.7783L106.398 33.5028C106.398 33.5028 97.9022 64.0514 78.3973 95.6603C58.8877 127.269 38.2037 154.782 18.7627 156.411C18.7627 156.411 37.3171 121.091 43.4912 92.351C49.6654 63.611 49.4826 60.8447 49.4826 60.8447Z" fill="#F79138"/>

          {/* Beak — Left side (masked) */}
          <mask id={`mask0_tucan_${bodyW}`} style={{maskType:'luminance'}} maskUnits="userSpaceOnUse" x="-7" y="6" width="71" height="166">
            <path d="M63.124 6.88281C63.124 6.88281 51.2465 146.41 8.11434 168.775C-35.0178 191.141 31.8694 50.1511 31.8694 50.1511L63.124 6.88281Z" fill="white"/>
          </mask>
          <g mask={`url(#mask0_tucan_${bodyW})`}>
            <path d="M49.5695 60.6435L51.4478 48.3215C51.4478 48.3215 52.2201 39.2702 59.5093 31.2664C66.7986 23.2627 82.9263 18.1491 82.9263 18.1491C82.9263 18.1491 93.9309 16.114 100.736 19.5259C107.536 22.9377 107.394 28.5771 107.394 28.5771L106.485 33.3016C106.485 33.3016 97.9891 63.8502 78.4842 95.4591C58.9746 127.068 38.2906 154.581 18.8496 156.21C18.8496 156.21 37.404 120.89 43.5781 92.1499C49.7523 63.4098 49.5695 60.6435 49.5695 60.6435Z" fill="#D05427"/>
          </g>

          {/* Beak — Right side (masked) */}
          <mask id={`mask1_tucan_${bodyW}`} style={{maskType:'luminance'}} maskUnits="userSpaceOnUse" x="12" y="11" width="117" height="152">
            <path d="M100.343 11.7266C100.343 11.7266 99.2187 76.8299 12.959 161.819L33.5288 162.439L125.506 103.612L128.622 23.8819L100.338 11.7266H100.343Z" fill="white"/>
          </mask>
          <g mask={`url(#mask1_tucan_${bodyW})`}>
            <path d="M49.4787 60.9209L51.3569 48.5988C51.3569 48.5988 52.1293 39.5476 59.4185 31.5438C66.7077 23.54 82.8354 18.4265 82.8354 18.4265C82.8354 18.4265 93.8401 16.3913 100.645 19.8032C107.445 23.2151 107.303 28.8545 107.303 28.8545L106.394 33.5789C106.394 33.5789 97.8983 64.1275 78.3934 95.7365C58.8838 127.345 38.1998 154.858 18.7588 156.487C18.7588 156.487 37.3132 121.167 43.4873 92.4272C49.6615 63.6872 49.4787 60.9209 49.4787 60.9209Z" fill="#F47530"/>
          </g>

          {/* Beak — Tip dot */}
          <path opacity="0.64" d="M18.7627 156.415C18.7627 156.415 20.7461 155.846 42.3716 108.14C58.2799 73.0461 59.5275 104.741 55.7481 114.262C51.9687 123.784 39.8443 148.526 18.7627 156.415Z" fill="#25292B"/>

          {/* Beak — Rim (top layer) */}
          <path d="M49.3004 62.6278C49.3004 62.6278 52.1841 37.9276 67.6126 25.9773C83.2787 13.8388 107.276 15.7586 106.399 33.5023L106.54 32.6686C106.54 32.6686 112.427 21.0689 100.197 16.3614C87.963 11.6583 80.395 15.9381 74.943 17.751C69.4863 19.5596 53.9984 31.1679 51.5352 39.6507C49.0719 48.1292 48.1488 51.353 49.305 62.6278H49.3004Z" fill="#282B2E"/>

        </g>
      </svg>
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
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [dotsOpen,  setDotsOpen]  = useState(false)

  const brandRef       = useRef<HTMLAnchorElement>(null)
  const navRef         = useRef<HTMLElement>(null)
  const dotsRef        = useRef<HTMLDivElement>(null)
  // Width of the nav when all 4 pills are visible — used for hysteresis check
  const fullNavWidthRef = useRef(0)

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen)
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.classList.remove('menu-open')
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Collision detection: collapse last 2 pills into ⋮ when gap ≤ COLLAPSE_GAP
  useEffect(() => {
    const check = () => {
      const brand = brandRef.current
      const nav   = navRef.current
      if (!brand || !nav) return

      const brandRight = brand.getBoundingClientRect().right
      const navRect    = nav.getBoundingClientRect()

      setCollapsed(prev => {
        const effectiveNavLeft = prev
          ? navRect.right - fullNavWidthRef.current
          : navRect.left
        const gap = effectiveNavLeft - brandRight

        if (!prev && gap <= COLLAPSE_GAP) {
          fullNavWidthRef.current = navRect.width
          return true
        }
        if (prev && gap > COLLAPSE_GAP) {
          return false
        }
        return prev
      })
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close ⋮ dropdown on outside click
  useEffect(() => {
    if (!dotsOpen) return
    const onPointer = (e: PointerEvent) => {
      if (dotsRef.current && !dotsRef.current.contains(e.target as Node)) {
        setDotsOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [dotsOpen])

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
          <a ref={brandRef} href="#hero" className="relative z-10 flex items-center gap-0 shrink-0 overflow-visible h-full outline-none">
            <div className="block lg:hidden h-full"><TucanLogo bodyW={100} /></div>
            <div className="hidden lg:block h-full"><TucanLogo bodyW={135} /></div>
            <span
              className="flex items-center justify-center font-bold tracking-normal select-none text-green font-accent pb-2 h-full w-full ml-3"
              style={{ fontSize: 'clamp(28px, 4.69vw, 90px)', lineHeight: '0.9' }}
            >
              <span className="logo-xs">TUCAN</span>
              <span className="logo-mob">TucanBRAS</span>
              <span className="logo-sm">Tucan</span>
              <span className="logo-full">TucanBRAS</span>
            </span>
          </a>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Desktop nav + language switcher */}
          <nav
            ref={navRef}
            className="relative z-10 hidden lg:flex w-fit items-start justify-start gap-3 pt-3 pb-4 px-3 shrink-0 h-full"
            aria-label="Основная навигация"
          >
            {(collapsed ? navLinks.slice(0, 2) : navLinks).map((link, i) => (
              <NavPill
                key={link.href}
                label={link.label}
                href={link.href}
                bg={NAV_PILL_STYLES[i]?.bg ?? 'var(--color-green)'}
                text={NAV_PILL_STYLES[i]?.text ?? 'var(--color-ink)'}
              />
            ))}

            {/* ⋮ button — shown when last 2 pills are collapsed */}
            {collapsed && (
              <div ref={dotsRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setDotsOpen(v => !v)}
                  className="relative flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none"
                  style={{
                    color:        'var(--color-cream)',
                    boxShadow:    PILL_INNER_SHADOW,
                    lineHeight:   '32px',
                    paddingTop:   '8px',
                    paddingBottom:'8px',
                    paddingLeft:  'clamp(8px, 0.83vw, 16px)',
                    paddingRight: 'clamp(8px, 0.83vw, 16px)',
                  }}
                  aria-haspopup="true"
                  aria-expanded={dotsOpen}
                  aria-label="Ещё пункты меню"
                >
                  {/* Blurred colour circles — background layer */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 40 48"
                    preserveAspectRatio="xMidYMid slice"
                    aria-hidden
                  >
                    <defs>
                      <filter id="dots-menu-blur" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="7"/>
                      </filter>
                    </defs>
                    {/* cx/cy — position, r — size, stdDeviation above — blur intensity */}
                    <circle cx="4"  cy="10" r="28" fill="var(--color-blue)"  filter="url(#dots-menu-blur)"/>
                    <circle cx="36" cy="6"  r="28" fill="var(--color-yellow)" filter="url(#dots-menu-blur)"/>
                    <circle cx="6"  cy="42" r="24" fill="var(--color-green)"   filter="url(#dots-menu-blur)"/>
                    <circle cx="38" cy="44" r="18" fill="var(--color-orange)" filter="url(#dots-menu-blur)"/>
                  </svg>

                  {/* Three-dot icon — foreground layer */}
                  <svg width="8" height="32" viewBox="0 0 8 32" fill="currentColor" aria-hidden className="relative">
                    <rect width="8" height="8" rx="4"/>
                    <rect y="12" width="8" height="8" rx="4"/>
                    <rect y="24" width="8" height="8" rx="4"/>
                  </svg>
                </button>

                <div
                  role="menu"
                  className="absolute right-0 top-full mt-4 flex flex-col gap-2 z-[60]"
                  style={{ pointerEvents: dotsOpen ? 'auto' : 'none' }}
                >
                  {navLinks.slice(2).map((link, i) => (
                    <a
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      onClick={() => setDotsOpen(false)}
                      className="relative flex items-center justify-center overflow-hidden rounded-btn font-semibold whitespace-nowrap select-none"
                      style={{
                        backgroundColor: NAV_PILL_STYLES[i + 2]?.bg ?? 'var(--color-green)',
                        color:           NAV_PILL_STYLES[i + 2]?.text ?? 'var(--color-ink)',
                        boxShadow:       'var(--shadow-pill-float)',
                        fontSize:        'clamp(14px, 1.35vw, 26px)',
                        lineHeight:      '32px',
                        paddingTop:      '8px',
                        paddingBottom:   '8px',
                        paddingLeft:     'clamp(8px, 0.83vw, 16px)',
                        paddingRight:    'clamp(8px, 0.83vw, 16px)',
                        opacity:         dotsOpen ? 1 : 0,
                        transform:       dotsOpen ? 'translateY(0)' : 'translateY(-10px)',
                        transition:      'opacity 200ms ease, transform 200ms ease',
                        transitionDelay: dotsOpen ? `${i * 50}ms` : '0ms',
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <LanguageSwitcher variant="pill" dropDirection="down" />
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
        {/* Mobile language switcher */}
        <LanguageSwitcher
          variant="pill"
          dropDirection="row"
          className="pointer-events-auto transition-all duration-300"
          style={{
            transitionDelay: menuOpen ? `${navLinks.length * 60}ms` : '0ms',
            opacity: menuOpen ? 1 : 0,
            transform: menuOpen ? 'translateY(0)' : 'translateY(-12px)',
          }}
        />
      </div>
    </header>
  )
}
