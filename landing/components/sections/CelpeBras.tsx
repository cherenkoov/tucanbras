import type { CSSProperties } from 'react'
import { CelpeBrasProps } from '@/types'
import CelpeBrasStack from '@/components/sections/CelpeBrasStack'

// ─── Static card config (icon + bg/tint color — not from CMS) ────────────────
// tint = frosted (glass) colour, bg = solid colour shown on hover
const CARD_CONFIG = [
  { icon: '/SVG/celpe-bras/structure.svg', bg: '#fffce5', tint: 'rgba(255,252,229,0.72)', text: '#323031' },
  { icon: '/SVG/celpe-bras/practice.svg',  bg: '#7cb082', tint: 'rgba(124,176,130,0.72)', text: '#fffce5' },
  { icon: '/SVG/celpe-bras/train.svg',     bg: '#2e67b2', tint: 'rgba(46,103,178,0.72)',  text: '#fffce5' },
  { icon: '/SVG/celpe-bras/plan.svg',      bg: '#f26434', tint: 'rgba(242,100,52,0.72)',  text: '#fffce5' },
  { icon: '/SVG/celpe-bras/help.svg',      bg: '#ffd376', tint: 'rgba(255,211,118,0.72)', text: '#323031' },
]

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ title, icon, bg, tint, text }: { title: string; icon: string; bg: string; tint: string; text: string }) {
  return (
    <div
      className="glass relative flex flex-1 items-center gap-[48px] min-w-[300px] overflow-hidden rounded-[44px] px-[32px] py-[32px] hover:scale-[1.04] active:scale-[0.95]"
      style={{
        minHeight: '164px',
        '--glass-tint': tint,
        '--glass-solid': bg,
        boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25), 0px 2px 4px 0px rgba(0,0,0,0.18)',
      } as CSSProperties}
    >
      {/* Icon */}
      <div className="shrink-0" style={{ width: 'clamp(48px, 6vw, 100px)', height: 'clamp(48px, 6vw, 100px)' }}>
        <img src={icon} alt="" className="w-full h-full object-contain pointer-events-none" />
      </div>

      {/* Label */}
      <p
        className="font-accent font-bold flex-1 min-w-0"
        style={{ fontSize: 'clamp(20px, 2vw, 36px)', lineHeight: '1.1', color: text, letterSpacing: '0.12em' }}
      >
        {title}
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CelpeBras({ data }: CelpeBrasProps) {
  const [c0, c1, c2, c3, c4] = data.cards

  return (
    <section id="celpe-bras" className="w-full scroll-mt-[136px] lg:scroll-mt-[147px]">
      <div className="flex flex-col gap-[64px] max-w-[1720px] mx-auto w-full">

        {/* ══ Heading ══ */}
        <h2
          className="font-heading font-bold text-ink text-center w-full"
          style={{ fontSize: 'clamp(36px, 5vw, 80px)', lineHeight: '1.1' }}
        >
          {data.heading}
        </h2>

        {/* ══ Feature grid — mobile: stacking scroll, desktop: grid ══ */}

        {/* Mobile stack */}
        <div className="lg:hidden">
          <CelpeBrasStack
            titles={[c0, c1, c2, c3, c4]}
            cardConfig={CARD_CONFIG}
          />
        </div>

        {/* Desktop grid */}
        <div className="hidden lg:flex flex-col gap-[20px] w-full">

          {/* Row 1 */}
          <div className="flex flex-row gap-[20px]">
            <FeatureCard title={c0} icon={CARD_CONFIG[0].icon} text={CARD_CONFIG[0].text} bg={CARD_CONFIG[0].bg} tint={CARD_CONFIG[0].tint} />
            <FeatureCard title={c1} icon={CARD_CONFIG[1].icon} text={CARD_CONFIG[1].text} bg={CARD_CONFIG[1].bg} tint={CARD_CONFIG[1].tint} />
          </div>

          {/* Row 2 */}
          <div className="flex flex-row gap-[20px]">
            <FeatureCard title={c2} icon={CARD_CONFIG[2].icon} text={CARD_CONFIG[2].text} bg={CARD_CONFIG[2].bg} tint={CARD_CONFIG[2].tint} />
            <FeatureCard title={c3} icon={CARD_CONFIG[3].icon} text={CARD_CONFIG[3].text} bg={CARD_CONFIG[3].bg} tint={CARD_CONFIG[3].tint} />
          </div>

          {/* Row 3: last card + quote */}
          <div className="flex flex-row gap-[20px]">
            <FeatureCard title={c4} icon={CARD_CONFIG[4].icon} text={CARD_CONFIG[4].text} bg={CARD_CONFIG[4].bg} tint={CARD_CONFIG[4].tint} />

            {/* Quote */}
            <div className="flex flex-1 items-center min-w-[300px] px-[32px] py-[32px]">
              <p
                className="font-accent font-bold text-ink"
                style={{ fontSize: 'clamp(16px, 1.5vw, 21px)', lineHeight: '1.4', letterSpacing: '0.05em' }}
              >
                &ldquo;{data.quote}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* ══ Footer: hint + CTA ══ */}
        <div className="flex flex-col gap-[42px] w-full lg:w-[485px]">

          {/* Hint text */}
          <p
            className="font-sans font-semibold text-ink px-[16px]"
            style={{ fontSize: 'clamp(20px, 2vw, 32px)', lineHeight: '1.25' }}
          >
            {data.hintText}
          </p>

          {/* CTA button */}
          <a
            href="#footer"
            className="btn-press flex items-center justify-center rounded-[66px] px-[44px] w-full lg:w-auto lg:min-w-[400px]"
            style={{
              backgroundColor: '#8fd096',
              paddingTop: '44px',
              paddingBottom: '44px',
              boxShadow: 'var(--shadow-btn)',
            }}
          >
            <span
              className="font-accent text-center text-ink"
              style={{ fontSize: 'clamp(24px, 1.2vw, 36px)', lineHeight: '1', letterSpacing: '0.1em' }}
            >
              {data.ctaText}
            </span>
          </a>
        </div>

      </div>
    </section>
  )
}
