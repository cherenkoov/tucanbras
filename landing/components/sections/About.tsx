import Image from 'next/image'
import { AboutProps } from '@/types'
import ScrollRotate         from '@/components/ui/ScrollRotate'
import FernAnimated         from '@/components/ui/FernAnimated'
import HibiscusUpAnimated   from '@/components/ui/HibiscusUpAnimated'
import HibiscusDownAnimated from '@/components/ui/HibiscusDownAnimated'

// ─── Assets ──────────────────────────────────────────────────────────────────
const IMG_SCREEN_DASHBOARD = '/PNG/about/screen-dashboard.png'
const IMG_SCREEN_CALENDAR  = '/PNG/about/screen-calendar.png'
const IMG_FLOWER           = '/SVG/about/flower.svg'

// ─── Main component ──────────────────────────────────────────────────────────

export default function About({ data }: AboutProps) {
  return (
    <section id="about" className="w-full scroll-mt-[136px] lg:scroll-mt-[147px]">
      <div
        className="
          flex flex-col gap-[12px] overflow-clip
          rounded-[38px]
          p-[12px]
          max-w-[1720px] mx-auto w-full
          backdrop-blur-[4px]
        "
        style={{
          backgroundColor: '#7cb08299',
          boxShadow: 'var(--shadow-hero)',
        }}
      >

        {/* ══ Row 1: Inspiration + CTA columns ══ */}
        <div className="flex flex-col lg:flex-row gap-[18px] lg:gap-[12px] items-stretch w-full">

          {/* ── Column 1: Heading block + Dashboard phone ── */}
          <div className="flex flex-col gap-[12px] items-start shrink-0 lg:w-[363px] lg:self-stretch">

            {/* Heading block */}
            <div
              className="relative flex flex-col gap-0 items-center w-full rounded-[26px] p-[36px] overflow-visible backdrop-blur-[4px] hover:backdrop-blur-none bg-[rgba(255,252,229,0.72)] hover:bg-[#fffce5] transition-all duration-300"
              style={{ boxShadow: 'var(--shadow-hero)' }}
            >
              <p
                className="w-full font-accent font-bold text-green"
                style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: '1' }}
              >
                {data.message1}
              </p>

              {/* Flower — absolute, overflows block bottom-right */}
              <div className="absolute bottom-[-107px] right-[-30px] w-[140px] h-[118px] pointer-events-none z-10">
                <ScrollRotate degreesPerScreen={180} transformOrigin="47% 44%">
                  <img alt="" src={IMG_FLOWER} className="w-full h-full" />
                </ScrollRotate>
              </div>
            </div>

            {/* Dashboard phone */}
            <div className="overflow-hidden w-full">
              <Image
                alt="TucanBRAS app — dashboard"
                src={IMG_SCREEN_DASHBOARD}
                width={1200}
                height={2478}
                className="w-full h-auto block pointer-events-none"
                loading="eager"
                priority
              />
            </div>
          </div>

          {/* ── Column 2: CTA block + Calendar phone ── */}
          <div className="flex flex-col lg:flex-row flex-nowrap gap-[18px] lg:gap-[12px] items-start flex-1 min-w-0">

            {/* CTA block */}
            <div
              className="relative flex flex-col overflow-hidden rounded-[26px] p-[36px] lg:flex-1 lg:min-w-[clamp(420px,_calc(420px_+_180_*_(100vw_-_1024px)_/_176),_600px)] lg:self-stretch backdrop-blur-[4px] hover:backdrop-blur-none bg-[rgba(255,252,229,0.72)] hover:bg-[#fffce5] transition-all duration-300"
              style={{ boxShadow: 'var(--shadow-hero)' }}
            >
              {/* Description */}
              <p
                className="font-sans font-normal text-ink w-full"
                style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: '1' }}
              >
                {data.description}
              </p>

              <div className="flex-1" />

              {/* Button container — plants positioned relative to it */}
              <div className="relative w-full mt-[40px] lg:mt-0">

                {/* Hibiscus orange (upsideup) */}
                <div className="absolute h-[250px] right-[-30px] top-[-205px] w-[260px] pointer-events-none z-10">
                  <HibiscusUpAnimated
                    stemMaxDegrees={8}
                    leafMaxDegrees={6}
                    velocitySensitivity={0.2}
                  />
                </div>

                {/* Hibiscus green (upsidedown) */}
                <div className="absolute h-[159px] right-[-48px] top-[-435px] w-[132px] pointer-events-none">
                  <HibiscusDownAnimated
                    stemMaxDegrees={8}
                    leafMaxDegrees={6}
                    velocitySensitivity={0.2}
                  />
                </div>

                {/* Fern — large, extends left outside block */}
                <FernAnimated
                  className="absolute pointer-events-none z-0"
                  style={{ height: '511px', width: '620px', left: '-260px', top: '-348px' }}
                />

                {/* CTA button */}
                <a
                  href="#comparison"
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

            {/* Calendar phone — hidden 1024–1409px, visible on mobile and ≥1410px */}
            <div className="about-calendar overflow-hidden w-full min-[1410px]:flex-none min-[1410px]:w-[600px] min-[1410px]:self-stretch min-[1410px]:rounded-bl-[60px] min-[1410px]:rounded-tr-[60px]">
              <Image
                alt="TucanBRAS app — calendar"
                src={IMG_SCREEN_CALENDAR}
                width={1200}
                height={2478}
                className="w-full h-auto block pointer-events-none"
                sizes="(max-width: 1024px) 100vw, (min-width: 1410px) 600px, 0px"
              />
            </div>
          </div>
        </div>

        {/* ══ Row 2: Motivation quote ══ */}
        <div
          className="flex flex-col items-center justify-center rounded-[26px] p-[36px] w-full z-10 backdrop-blur-[4px] hover:backdrop-blur-none bg-[rgba(255,252,229,0.72)] hover:bg-[#fffce5] transition-all duration-300"
          style={{ boxShadow: 'var(--shadow-hero)', minHeight: '264px' }}
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
