import type { CSSProperties } from 'react'
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
    <section id="about" className="w-full scroll-mt-[136px] lg:scroll-mt-[164px]">
      <div
        className="glass flex flex-col gap-[12px] overflow-visible min-[740px]:overflow-hidden rounded-[38px] p-[12px] max-w-[1720px] mx-auto w-full"
        style={{
          boxShadow: 'var(--shadow-hero)',
          '--glass-tint': '#7cb08299',
          '--glass-solid': '#7cb082',
        } as CSSProperties}
      >

        {/* ══ Row 1: flat grid — mobile stacks, tablet 2×2, desktop 363+1fr(+600) ══ */}
        <div className="about-row1 w-full">

          {/* Inspiration heading */}
          <div
            className="about-inspiration glass relative z-20 flex flex-col gap-0 items-center w-full rounded-[26px] p-[36px] overflow-visible"
            style={{
              boxShadow: 'var(--shadow-hero)',
              // cream card on the green frame — reset the inherited green glass vars to the .glass cream default
              '--glass-tint': 'initial',
              '--glass-solid': 'initial',
            } as CSSProperties}
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
          <div className="about-dashboard overflow-hidden w-full">
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

          {/* CTA block — spans both grid rows at desktop */}
          <div
            className="about-cta glass relative flex flex-col overflow-hidden rounded-[26px] p-[36px]"
            style={{
              boxShadow: 'var(--shadow-hero)',
              // cream card on the green frame — reset the inherited green glass vars to the .glass cream default
              '--glass-tint': 'initial',
              '--glass-solid': 'initial',
            } as CSSProperties}
          >
            {/* Description */}
            <p
              className="relative z-[1] font-sans font-normal text-ink w-full"
              style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', lineHeight: '1' }}
            >
              {data.description}
            </p>

            <div className="flex-1" />

            {/* Button container — plants positioned relative to it.
                @container so the hover drop can reference the button's own width (cqw). */}
            <div className="relative w-full mt-[420px] lg:mt-0 @container">

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

              {/* CTA button — pill at rest; corners tighten (radius shrinks) on hover. */}
              <a
                href="#comparison"
                className="btn-press-tighten relative flex items-center justify-center w-full overflow-hidden rounded-[66px] cursor-pointer"
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

          {/* Calendar — mobile only (<740px): fill with natural aspect ratio */}
          <div className="about-calendar-mob min-[740px]:hidden relative overflow-hidden w-full aspect-[992/1992]">
            <Image
              alt="TucanBRAS app — calendar"
              src={IMG_SCREEN_CALENDAR}
              fill
              sizes="100vw"
              className="object-contain object-top pointer-events-none"
            />
          </div>

          {/* Calendar — desktop only (≥1410px): fill grid cell, col 3 rows 1/3 */}
          <div className="about-calendar relative overflow-hidden min-[1410px]:rounded-bl-[60px] min-[1410px]:rounded-tr-[60px]">
            <Image
              alt="TucanBRAS app — calendar"
              src={IMG_SCREEN_CALENDAR}
              fill
              sizes="(min-width: 1410px) 600px, 0px"
              className="object-contain object-left-top pointer-events-none"
            />
          </div>

        </div>

        {/* Motivation quote — full-width, outside grid */}
        <div
          className="glass flex flex-col items-center justify-center rounded-[26px] p-[36px] w-full z-10"
          style={{
            boxShadow: 'var(--shadow-hero)',
            // cream card on the green frame — reset the inherited green glass vars to the .glass cream default
            '--glass-tint': 'initial',
            '--glass-solid': 'initial',
          } as CSSProperties}
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
