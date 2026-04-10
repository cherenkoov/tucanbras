import type { PlansProps, PlanCard } from '@/types'

// ─── Assets ──────────────────────────────────────────────────────────────────
const BG = [
  '/plans/cover-1.svg',
  '/plans/cover-2.svg',
  '/plans/cover-3.svg',
  '/plans/cover-4.svg',
]

// Checkmark icon used in feature rows
const ICON_CHECK = '/marks/Mark%20-%20Positive.svg'

// ─── Per-plan static config ───────────────────────────────────────────────────
// featuresFirst: desktop layout — true = features|price, false = price|features
// textCream: cream text on desktop; mobileTextCream: cream text on mobile
const CONFIG = [
  { featuresFirst: true,  textCream: false, mobileTextCream: false, accent: '#8FD096', btnText: null      }, // One
  { featuresFirst: false, textCream: true,  mobileTextCream: true,  accent: '#FFFCE5', btnText: '#7CB082' }, // Base
  { featuresFirst: true,  textCream: false, mobileTextCream: false, accent: '#2E67B2', btnText: '#FFD376' }, // Pro
  { featuresFirst: false, textCream: true,  mobileTextCream: true,  accent: '#FFD376', btnText: '#F69137' }, // Premium
]

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function PlanSection({ plan, index }: { plan: PlanCard; index: number }) {
  const cfg = CONFIG[index]
  const isLast = index === 3

  // Price text colors
  const priceColor = [
    cfg.mobileTextCream ? 'text-cream' : 'text-ink',
    cfg.textCream       ? 'lg:text-cream' : 'lg:text-ink',
  ].join(' ')

  // Desktop: plans 0,2 → features|price (price on right = row-reverse)
  //          plans 1,3 → price|features (price on left = normal row)
  // Mobile: always col — price top, features below.
  // DOM order: price block always first (so it's on top in mobile).
  // For featuresFirst desktop plans we apply lg:flex-row-reverse.
  const rowClass = cfg.featuresFirst ? 'flex-col lg:flex-row-reverse' : 'flex-col lg:flex-row'

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] px-[32px] py-[64px] w-full ${isLast ? '' : 'mb-[-48px]'}`}
    >
      {/* Background */}
      <img
        src={BG[index]}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Plan content */}
      <div className={`relative flex ${rowClass} items-center justify-between gap-[0px] w-full`}>

        {/* ── Price block ── */}
        <div className={`flex flex-col items-center ${cfg.featuresFirst ? 'lg:items-end' : 'lg:items-start'} shrink-0 lg:flex-1`}>
          {/* Plan name */}
          <p
            className={`font-sans font-semibold w-full ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'} text-center ${cfg.featuresFirst ? 'lg:text-right' : 'lg:text-left'}`}
            style={{ fontSize: 'clamp(18px, 1.8vw, 32px)', lineHeight: '1.15' }}
          >
            {plan.name}
          </p>

          {/* Price amount + period */}
          <div className={`flex items-baseline lg:flex-col ${priceColor}`}>
            <span
              className="font-heading font-bold"
              style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: '1.1' }}
            >
              {plan.priceAmount}
            </span>
            <span
              className="font-heading font-bold"
              style={{ fontSize: 'clamp(40px, 5vw, 80px)', lineHeight: '1.1' }}
            >
              {plan.pricePeriod}
            </span>
          </div>

          {/* Subtitle */}
          <p
            className={`font-sans font-semibold w-full text-center ${cfg.featuresFirst ? 'lg:text-right' : 'lg:text-left'} ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'}`}
            style={{ fontSize: 'clamp(14px, 1.2vw, 21px)', lineHeight: '1.2' }}
          >
            {plan.subtitle}
          </p>
        </div>

        {/* ── Features + CTA ── */}
        <div className="flex flex-col gap-[32px] shrink-0 lg:flex-1 w-full lg:w-auto mt-[32px] lg:mt-0">
          {/* Feature list */}
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

          {/* CTA button */}
          <a
            href={plan.ctaHref} // TODO: TBD
            className="flex items-center justify-center w-full overflow-hidden rounded-[28px]"
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
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Plans({ data }: PlansProps) {
  return (
    <section id="plans" className="w-full">
      <div className="flex flex-col gap-[60px] max-w-[1720px] mx-auto w-full overflow-hidden rounded-[28px]"
        style={{ boxShadow: '0px 2px 4px 0px rgba(0,0,0,0.18), inset 0px 4px 4px 0px rgba(255,255,255,0.25)' }}
      >

        {/* ══ Heading ══ */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-[60px] lg:gap-[48px] px-[32px] pt-[60px] text-ink">
          <p
            className="font-heading flex-1 text-center lg:text-left"
            style={{ fontSize: 'clamp(24px, 2.5vw, 48px)', lineHeight: '1.3' }}
          >
            {data.heading1}
          </p>
          <p
            className="font-heading flex-1 text-center lg:text-left lg:max-w-[640px]"
            style={{ fontSize: 'clamp(24px, 2.5vw, 48px)', lineHeight: '1.3' }}
          >
            {data.heading2}
          </p>
        </div>

        {/* ══ Plan list — plans overlap with mb-[-48px] ══ */}
        <div className="flex flex-col items-start w-full pb-[48px]">
          {data.plans.map((plan, i) => (
            <PlanSection key={plan.name} plan={plan} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
