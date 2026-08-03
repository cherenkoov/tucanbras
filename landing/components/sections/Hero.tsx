import type { CSSProperties } from 'react'
import type { HeroProps } from "@/types";
import FreeLessonButton from '@/components/ui/FreeLessonButton'
import { HERO_ANTHURIUM, decorSrc } from '@/components/ui/heroPlants'

export default function Hero({ data }: HeroProps) {
  return (
    <section id="hero" className="w-full pt-[80px] scroll-mt-[136px] lg:scroll-mt-[164px]">

      <div className="max-w-[1720px] mx-auto w-full">

      {/* Container — width fits content, glass → solid blue on hover */}
      <div
        data-glass-center
        className="glass flex w-fit max-[500px]:w-full flex-col gap-0 rounded-feat p-s300"
        style={{
          boxShadow: 'var(--shadow-hero)',
          '--glass-tint': '#2e67b266',
          '--glass-solid': '#2e67b2',
        } as CSSProperties}
      >

        {/* Heading — H3: Involve Medium 72px */}
        <h1
          className="h-full px-s200 pt-s200 font-sans font-medium text-cream"
          style={{
            fontSize: 'clamp(24px, 3.75vw, 72px)',
            lineHeight: '1.125',
          }}
        >
          <span className="block whitespace-nowrap max-[335px]:whitespace-normal">{data.heading1}</span>
          <span className="block whitespace-nowrap max-[335px]:whitespace-normal">{data.heading2}</span>
        </h1>

        {/* CTA button — wrapper is an @container so the button's hover translate can
            reference its own width (0.5cqw) for an even gap to the cover, and the
            anthurium measures itself in that same cqw (see heroPlants.ts) so the two
            scale off one number. `relative` is what the flower hangs off. */}
        <div className="relative mt-[24px] @container">
          <FreeLessonButton
            ctaText={data.ctaText}
            className="btn-press-hero peer inline-flex w-full items-center justify-center rounded-[26px] font-bold text-ink bg-yellow whitespace-nowrap cursor-pointer"
            style={{
              fontSize: 'clamp(20px, 2.5vw, 48px)',
              lineHeight: '1',
              paddingTop: '24px',
              paddingBottom: '24px',
              paddingLeft: 'var(--spacing-s400)',
              paddingRight: 'var(--spacing-s400)',
              boxShadow: 'var(--shadow-btn)',
            }}
          />

          {/* Anthurium — a SIBLING of the button, and later in the DOM so it paints over
              it. It answers to the button's own hover (`peer-hover`, which Tailwind
              already gates behind `hover: hover` so a tap cannot leave it stuck), on
              the header's `.pill-decor` timing: the button snaps to size in 120ms and
              the greenery drifts in behind it for another 220. */}
          <img
            src={decorSrc(HERO_ANTHURIUM.file)}
            alt=""
            aria-hidden
            data-hero-plant="anthurium"
            /* The offsets place the base of the spadix 20px inside the button's
               top-right corner; they are `anthuriumOffsets()` in heroPlants.ts,
               evaluated. Spelled out rather than computed because a `max-[500px]:`
               variant is the whole reason this lives in classes and Tailwind only
               generates what it can read literally — `verify:hero-plants` measures
               where that point actually lands, so the two halves cannot drift.
               `max-w-none` defeats preflight's `max-width: 100%`, which otherwise
               beats the width and lands the flower at the wrong size and offset. */
            className="pill-decor absolute h-auto max-w-none select-none pointer-events-none
                       w-[25cqw] right-[calc(20px_-_12.8825cqw)] top-[calc(20px_-_15.0896cqw)]
                       max-[500px]:w-[24cqw] max-[500px]:right-[calc(20px_-_12.3672cqw)] max-[500px]:top-[calc(20px_-_14.4860cqw)]
                       motion-safe:peer-hover:translate-x-[-4%] motion-safe:peer-hover:scale-[1.08] motion-safe:peer-hover:rotate-[-5deg]"
          />
        </div>

      </div>

      </div>
    </section>
  );
}
