import { CelpeBrasProps } from '@/types'

// ─── Static card config (icon + bg color — not from CMS) ─────────────────────
const CARD_CONFIG = [
  { icon: '/celpe-bras/structure.svg', bg: '#fffce5', text: '#323031' },
  { icon: '/celpe-bras/practice.svg',  bg: '#7cb082', text: '#fffce5' },
  { icon: '/celpe-bras/train.svg',     bg: '#2e67b2', text: '#fffce5' },
  { icon: '/celpe-bras/plan.svg',      bg: '#f26434', text: '#fffce5' },
  { icon: '/celpe-bras/help.svg',      bg: '#ffd376', text: '#323031' },
]

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ title, icon, bg, text }: { title: string; icon: string; bg: string; text: string }) {
  return (
    <div
      className="relative flex flex-1 items-center gap-[48px] min-w-[300px] overflow-hidden rounded-[44px] px-[32px] py-[32px]"
      style={{
        minHeight: '164px',
        backgroundColor: bg,
        boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.25), 0px 2px 4px 0px rgba(0,0,0,0.18)',
      }}
    >
      {/* Icon */}
      <div className="shrink-0 w-[100px] h-[100px]">
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
    <section id="celpe-bras" className="w-full">
      <div className="flex flex-col gap-[64px] max-w-[1720px] mx-auto w-full">

        {/* ══ Heading ══ */}
        <h2
          className="font-heading font-bold text-ink text-center w-full"
          style={{ fontSize: 'clamp(36px, 5vw, 80px)', lineHeight: '1.1' }}
        >
          {data.heading}
        </h2>

        {/* ══ Feature grid ══ */}
        <div className="flex flex-col gap-[20px] w-full">

          {/* Row 1 */}
          <div className="flex flex-col lg:flex-row gap-[20px]">
            <FeatureCard title={c0} icon={CARD_CONFIG[0].icon} text={CARD_CONFIG[0].text} bg={CARD_CONFIG[0].bg} />
            <FeatureCard title={c1} icon={CARD_CONFIG[1].icon} text={CARD_CONFIG[1].text} bg={CARD_CONFIG[1].bg} />
          </div>

          {/* Row 2 */}
          <div className="flex flex-col lg:flex-row gap-[20px]">
            <FeatureCard title={c2} icon={CARD_CONFIG[2].icon} text={CARD_CONFIG[2].text} bg={CARD_CONFIG[2].bg} />
            <FeatureCard title={c3} icon={CARD_CONFIG[3].icon} text={CARD_CONFIG[3].text} bg={CARD_CONFIG[3].bg} />
          </div>

          {/* Row 3: last card + quote */}
          <div className="flex flex-col lg:flex-row gap-[20px]">
            <FeatureCard title={c4} icon={CARD_CONFIG[4].icon} text={CARD_CONFIG[4].text} bg={CARD_CONFIG[4].bg} />

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
            href={data.ctaHref} // TODO: TBD
            className="flex items-center justify-center w-full overflow-hidden rounded-[28px]"
            style={{
              backgroundColor: '#8fd096',
              paddingTop: '32px',
              paddingBottom: '32px',
              boxShadow: '0px 1px 4px 0px rgba(0,0,0,0.18), inset 0px 1px 2px 0px rgba(255,255,255,0.18)',
            }}
          >
            <span
              className="font-accent font-bold text-ink"
              style={{ fontSize: '48px', lineHeight: '32px' }}
            >
              {data.ctaText}
            </span>
          </a>
        </div>

      </div>
    </section>
  )
}
