import type { PlansProps, PlanCard } from '@/types'

// ─── Assets ──────────────────────────────────────────────────────────────────
// TODO: export from Figma → save to /public/plans/ and replace URLs
const BG: Record<number, { desktop: string; mobile: string }> = {
  0: {
    desktop: 'https://www.figma.com/api/mcp/asset/601ac022-edde-4e1f-bceb-1c1b8f54c6d8',
    mobile:  'https://www.figma.com/api/mcp/asset/6e3a3c3b-3ca1-4527-b8ac-b1fc1d561724',
  },
  1: {
    desktop: 'https://www.figma.com/api/mcp/asset/0a798cc3-3cb2-41e8-bf4a-9926095a69e5',
    mobile:  'https://www.figma.com/api/mcp/asset/8cb01d0f-69e2-4d19-b9b7-afb0d66d30ca',
  },
  2: {
    desktop: 'https://www.figma.com/api/mcp/asset/5afa1c27-05fc-4dfe-8952-1010e511dc0b',
    mobile:  'https://www.figma.com/api/mcp/asset/22c01d01-22bc-4f98-999c-a84d73a0b6d3',
  },
  3: {
    desktop: 'https://www.figma.com/api/mcp/asset/f42efe64-28e5-4a81-b55b-7b8fb0736f0c',
    mobile:  'https://www.figma.com/api/mcp/asset/a52a3dec-10cf-4079-96f3-3957a65a6699',
  },
}

// Checkmark icon used in feature rows
const ICON_CHECK = 'https://www.figma.com/api/mcp/asset/d381756e-9680-4498-9bcf-0ba483dd8333'

// ─── Per-plan static config ───────────────────────────────────────────────────
// featuresFirst: desktop layout — true = features|price, false = price|features
// textCream: cream text on desktop; mobileTextCream: cream text on mobile
const CONFIG = [
  { featuresFirst: true,  textCream: false, mobileTextCream: false }, // One
  { featuresFirst: false, textCream: true,  mobileTextCream: true  }, // Base
  { featuresFirst: true,  textCream: true,  mobileTextCream: false }, // Pro
  { featuresFirst: false, textCream: true,  mobileTextCream: true  }, // Premium
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function FeatureRow({ text, textCream, mobileTextCream }: {
  text: string
  textCream: boolean
  mobileTextCream: boolean
}) {
  const colorClass = [
    mobileTextCream ? 'text-cream' : 'text-ink',
    textCream       ? 'lg:text-cream' : 'lg:text-ink',
  ].join(' ')

  return (
    <div className="flex items-center gap-[16px] px-[8px]">
      <div className="shrink-0 w-[32px] h-[36px] relative">
        <img src={ICON_CHECK} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
      </div>
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
      style={{ boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25), 0px 2px 4px 0px rgba(0,0,0,0.18)' }}
    >
      {/* Background — responsive: different image per breakpoint */}
      <img
        src={BG[index].desktop}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none hidden lg:block"
      />
      <img
        src={BG[index].mobile}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none lg:hidden"
      />

      {/* Plan content */}
      <div className={`relative flex ${rowClass} items-center justify-between gap-[0px] w-full`}>

        {/* ── Price block ── */}
        <div className={`flex flex-col items-center lg:items-start shrink-0 lg:flex-1`}>
          {/* Plan name */}
          <p
            className={`font-sans font-semibold w-full ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'} text-center lg:text-left`}
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
            className={`font-sans font-semibold w-full text-center lg:text-left ${cfg.mobileTextCream ? 'text-cream' : 'text-ink'} ${cfg.textCream ? 'lg:text-cream' : 'lg:text-ink'}`}
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
              />
            ))}
          </div>

          {/* CTA button */}
          <a
            href={plan.ctaHref} // TODO: TBD
            className="flex items-center justify-center w-full overflow-hidden rounded-[28px]"
            style={{
              backgroundColor: '#8fd096',
              paddingTop: '32px',
              paddingBottom: '32px',
              paddingLeft: '16px',
              paddingRight: '16px',
              boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
            }}
          >
            <span
              className="font-sans font-bold text-cream text-center"
              style={{ fontSize: 'clamp(24px, 2.5vw, 48px)', lineHeight: '32px' }}
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
        <div className="flex flex-col lg:flex-row items-start justify-between gap-[60px] lg:gap-[48px] px-[32px] pt-[60px] text-cream">
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
