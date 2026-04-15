import type { HeroProps } from "@/types";
import FreeLessonButton from '@/components/FreeLessonButton'

export default function Hero({ data }: HeroProps) {
  return (
    <section id="hero" className="w-full pt-[80px] pb-[80px]">

      <div className="max-w-[1720px] mx-auto w-full">

      {/* Container — width fits content, glassmorphism */}
      <div
        className="flex w-fit max-[500px]:w-full flex-col gap-0 rounded-feat p-s300 backdrop-blur-[4px]"
        style={{
          backgroundColor: '#2e67b266',
          boxShadow: 'var(--shadow-hero)',
        }}
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

        {/* CTA button */}
        <div className="mt-[24px]">
          <FreeLessonButton
            ctaText={data.ctaText}
            className="inline-flex w-full items-center justify-center rounded-[26px] font-bold text-ink bg-yellow whitespace-nowrap cursor-pointer"
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
        </div>

      </div>

      </div>
    </section>
  );
}
