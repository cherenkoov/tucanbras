'use client'

import { scrollToElement } from '@/components/ui/AnchorScrollHandler'
import type { PlanCard } from '@/types'

export const BG = [
  '/plans/cover-1.svg',
  '/plans/cover-2.svg',
  '/plans/cover-3.svg',
  '/plans/cover-4.svg',
]

const MOBILE_BG = [
  '/plans/cover-mobile-1.svg',
  '/plans/cover-mobile-2.svg',
  '/plans/cover-mobile-3.svg',
  '/plans/cover-mobile-4.svg',
]

const ICON_CHECK = '/marks/Mark%20-%20Positive.svg'

export const CONFIG = [
  { featuresFirst: true,  textCream: false, mobileTextCream: false, accent: '#8FD096', btnText: null      },
  { featuresFirst: false, textCream: true,  mobileTextCream: true,  accent: '#FFFCE5', btnText: '#7CB082' },
  { featuresFirst: true,  textCream: false, mobileTextCream: false, accent: '#2E67B2', btnText: '#FFD376' },
  { featuresFirst: false, textCream: true,  mobileTextCream: true,  accent: '#FFD376', btnText: '#F69137' },
]

function FeatureRow({ text, textCream, mobileTextCream, accent }: {
  text: string
  textCream: boolean
  mobileTextCream: boolean
  accent: string
}) {
  const colorClass = [
    mobileTextCream ? 'text-cream' : 'text-ink',
    textCream       ? 'lg:text-cream' : 'lg:text-ink',
  ].join(' ')

  return (
    <div className="flex items-center gap-[16px] px-[8px]">
      <div
        className="shrink-0 w-[32px] h-[36px]"
        style={{
          backgroundColor: accent,
          WebkitMaskImage: `url(${ICON_CHECK})`,
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: `url(${ICON_CHECK})`,
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
      />
      <span
        className={`font-sans font-bold ${colorClass}`}
        style={{ fontSize: 'clamp(16px, 1.5vw, 24px)', lineHeight: '1.2' }}
      >
        {text}
      </span>
    </div>
  )
}

export function PlanSection({ plan, index }: { plan: PlanCard; index: number }) {
  const cfg    = CONFIG[index]
  const isLast = index === 3

  const handleCtaClick = () => {
    window.dispatchEvent(new CustomEvent('plan-selected', { detail: plan.name }))
    const footer = document.getElementById('footer')
    if (footer) scrollToElement(footer)
  }

  const priceColor = [
    cfg.mobileTextCream ? 'text-cream' : 'text-ink',
    cfg.textCream       ? 'lg:text-cream' : 'lg:text-ink',
  ].join(' ')

  const rowClass = cfg.featuresFirst ? 'flex-col lg:flex-row-reverse' : 'flex-col lg:flex-row'

  return (
    <div
      className={`relative px-[32px] py-[64px] w-full overflow-hidden rounded-[28px] lg:overflow-visible lg:rounded-none ${isLast ? '' : 'mb-[-48px]'}`}
    >
      {/* Mobile SVG background (custom notch shape); transparent notch reveals card below */}
      <div
        className="lg:hidden absolute inset-0"
        style={{
          backgroundImage: `url(${MOBILE_BG[index]})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />
      {/* Desktop SVG background (custom notch shape + preserveAspectRatio="none"); transparent notch reveals card below */}
      <div
        className="hidden lg:block absolute inset-0"
        style={{
          backgroundImage: `url(${BG[index]})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className={`relative z-10 flex ${rowClass} items-center justify-between gap-[0px] w-full`}>

        <div className={`flex flex-col items-center ${cfg.featuresFirst ? 'lg:items-end' : 'lg:items-start'} shrink-0 lg:flex-1`}>
          <p
            className={`font-sans font-semibold w-full ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'} text-center ${cfg.featuresFirst ? 'lg:text-right' : 'lg:text-left'}`}
            style={{ fontSize: 'clamp(18px, 1.8vw, 32px)', lineHeight: '1.15' }}
          >
            {plan.name}
          </p>

          <div className={`flex items-baseline lg:flex-col ${priceColor}`}>
            <span className="font-heading font-bold" style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: '1.1' }}>
              {plan.priceAmount}
            </span>
            <span className="font-heading font-bold" style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: '1.1' }}>
              {plan.pricePeriod}
            </span>
          </div>

          <p
            className={`font-sans font-semibold w-full text-center ${cfg.featuresFirst ? 'lg:text-right' : 'lg:text-left'} ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'}`}
            style={{ fontSize: 'clamp(14px, 1.2vw, 21px)', lineHeight: '1.2' }}
          >
            {plan.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-[32px] shrink-0 lg:flex-1 w-full lg:w-auto mt-[32px] lg:mt-0">
          <div className="flex flex-col gap-[24px]">
            {plan.features.map(f => (
              <FeatureRow
                key={f}
                text={f}
                textCream={cfg.textCream}
                mobileTextCream={cfg.mobileTextCream}
                accent={cfg.accent}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleCtaClick}
            className="flex items-center justify-center w-full overflow-hidden rounded-[28px] cursor-pointer"
            style={{
              backgroundColor: cfg.accent,
              paddingTop: '32px',
              paddingBottom: '32px',
              paddingLeft: '16px',
              paddingRight: '16px',
              boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
            }}
          >
            <span
              className="font-sans font-bold text-center"
              style={{ fontSize: 'clamp(24px, 2.5vw, 48px)', lineHeight: '32px', color: cfg.btnText ?? 'var(--color-cream)' }}
            >
              {plan.ctaText}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
