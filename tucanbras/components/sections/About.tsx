import { AboutProps } from '@/types'

// ─── Assets ──────────────────────────────────────────────────────────────────
const IMG_SCREEN_DASHBOARD = '/images/about/screen-dashboard.png'
const IMG_SCREEN_CALENDAR  = '/images/about/screen-calendar.png'
const IMG_FERN             = '/about/fern.svg'
const IMG_FLOWER           = '/about/flower.svg'
const IMG_HIBISCUS_UP      = '/about/hibiscus-up.svg'
const IMG_HIBISCUS_DOWN    = '/about/hibiscus-down.svg'

// ─── Main component ──────────────────────────────────────────────────────────

export default function About({ data }: AboutProps) {
  return (
    <section id="about" className="w-full">
      <div
        className="
          flex flex-col gap-[12px] overflow-visible lg:overflow-clip
          rounded-[38px] lg:rounded-[44px]
          p-[12px]
          max-w-[1720px] mx-auto w-full
          shadow-[0px_2px_4px_0px_rgba(0,0,0,0.18)]
        "
        style={{ backgroundColor: '#7cb082' }}
      >

        {/* ══ Row 1: Inspiration + CTA columns ══ */}
        <div className="flex flex-col lg:flex-row gap-[18px] lg:gap-[12px] items-stretch w-full">

          {/* ── Column 1: Heading block + Calendar phone ── */}
          <div className="flex flex-col gap-[12px] lg:gap-[40px] items-start shrink-0 lg:w-[363px]">

            {/* Heading block */}
            <div
              className="relative flex flex-col gap-0 items-center w-full rounded-[26px] p-[36px] overflow-visible"
              style={{ backgroundColor: '#fffce5' }}
            >
              <p
                className="w-full font-accent font-bold text-green"
                style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: '1' }}
              >
                {data.message1}
              </p>

              {/* Flower — absolute, overflows block bottom-right */}
              <div className="absolute bottom-[-107px] right-[-30px] w-[140px] h-[118px] pointer-events-none z-10">
                <img alt="" src={IMG_FLOWER} className="w-full h-full" />
              </div>
            </div>

            {/* Dashboard phone */}
            <div className="flex flex-col flex-nowrap justify-start items-end overflow-visible rounded-bl-[60px] rounded-tr-[60px] w-full lg:h-[200px]">
              <img
                alt="TucanBRAS app — dashboard"
                src={IMG_SCREEN_DASHBOARD}
                className="w-full h-auto block pointer-events-none lg:w-[600px] lg:max-w-none"
              />
            </div>
          </div>

          {/* ── Column 2: CTA block + Dashboard phone ── */}
          <div className="flex flex-col lg:flex-row flex-nowrap gap-[18px] lg:gap-[12px] items-start flex-1 min-w-0">

            {/* CTA block */}
            <div
              className="relative flex flex-col gap-[320px] justify-between overflow-hidden rounded-[26px] p-[36px] flex-1 min-w-0 lg:min-w-[600px] lg:max-w-[720px] lg:h-[1012px]"
              style={{ backgroundColor: '#fffce5' }}
            >
              {/* Description */}
              <p
                className="font-sans font-normal text-ink w-full"
                style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: '1' }}
              >
                {data.description}
              </p>

              {/* Button container — plants positioned relative to it */}
              <div className="relative w-full mt-[40px] lg:mt-0">

                {/* Hibiscus orange (upsideup) */}
                <div className="absolute h-[237px] right-[22px] top-[-221px] w-[148px] pointer-events-none z-10">
                  <img alt="" src={IMG_HIBISCUS_UP} className="w-full h-full" />
                </div>

                {/* Hibiscus green (upsidedown) */}
                <div className="absolute h-[159px] right-[-59px] top-[-435px] w-[132px] pointer-events-none">
                  <img alt="" src={IMG_HIBISCUS_DOWN} className="w-full h-full" />
                </div>

                {/* Fern — large, extends left outside block */}
                <div
                  className="absolute pointer-events-none z-0"
                  style={{ height: '511px', width: '620px', left: '-260px', top: '-348px' }}
                >
                  <img
                    alt=""
                    src={IMG_FERN}
                    className="w-full h-full"
                    style={{ transform: 'rotate(-15.08deg)' }}
                  />
                </div>

                {/* CTA button */}
                <a
                  href={data.ctaHref} // TODO: TBD
                  className="relative flex items-center justify-center w-full overflow-hidden rounded-[66px]"
                  style={{
                    backgroundColor: '#f26434',
                    paddingTop: '36px',
                    paddingBottom: '36px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    boxShadow: 'var(--shadow-btn)',
                  }}
                >
                  <span
                    className="font-accent font-bold text-cream relative z-10"
                    style={{ fontSize: '32px', lineHeight: '32px' }}
                  >
                    {data.ctaText}
                  </span>
                </a>
              </div>
            </div>

            {/* Calendar phone */}
            <div className="overflow-visible rounded-bl-[60px] rounded-tr-[60px] w-full lg:flex-none lg:w-[600px] lg:h-[1012px]">
              <img
                alt="TucanBRAS app — calendar"
                src={IMG_SCREEN_CALENDAR}
                className="w-full h-auto block pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* ══ Row 2: Motivation quote ══ */}
        <div
          className="flex flex-col items-center justify-center rounded-[36px] p-[36px] w-full z-10"
          style={{ backgroundColor: '#fffce5', minHeight: '264px' }}
        >
          <p
            className="font-accent font-bold text-center w-full"
            style={{ fontSize: 'clamp(24px, 3.5vw, 48px)', lineHeight: '1', color: '#2e67b2' }}
          >
            {data.message2}
          </p>
        </div>

      </div>
    </section>
  )
}
