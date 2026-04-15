import type { PlansProps } from '@/types'
import { PlanSection } from '@/components/PlanSectionShared'
import PlansStack from '@/components/PlansStack'

// ─── Main component ───────────────────────────────────────────────────────────

export default function Plans({ data }: PlansProps) {
  return (
    <section id="plans" className="w-full">
      <div className="flex flex-col gap-[60px] max-w-[1720px] mx-auto w-full lg:overflow-hidden rounded-[28px]"
        style={{}}
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

        {/* ══ Plan list — mobile: stacking scroll, desktop: overlap stack ══ */}

        {/* Mobile */}
        <div className="lg:hidden px-[0px]">
          <PlansStack plans={data.plans} />
        </div>

        {/* Desktop */}
        <div className="hidden lg:flex flex-col items-start w-full pb-[48px]">
          {data.plans.map((plan, i) => (
            <PlanSection key={plan.name} plan={plan} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
