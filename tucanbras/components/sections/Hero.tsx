import { HeroProps } from "@/types";

export default function Hero({ data }: HeroProps) {
  return (
    <section id="hero" className="w-full pt-[80px] pb-s800">

      {/* Container — width fits content, glassmorphism */}
      <div
        className="flex w-fit flex-col gap-0 rounded-feat p-s300 backdrop-blur-[4px]"
        style={{
          backgroundColor: '#2e67b266',
          boxShadow: 'var(--shadow-hero)',
        }}
      >

        {/* Heading — H3: Involve Medium 72px */}
        <h1
          className="h-full px-s200 pt-s200 font-sans font-medium text-cream"
          style={{
            fontSize: 'clamp(16px, 3.75vw, 72px)',
            lineHeight: 'clamp(20px, 4.22vw, 81px)',
          }}
        >
          <span className="block whitespace-nowrap">{data.heading1}</span>
          <span className="block whitespace-nowrap">{data.heading2}</span>
        </h1>

        {/* CTA button */}
        <div className="mt-[24px]">
          <a
            href={data.ctaHref} // TODO: TBD
            className="inline-flex w-full items-center justify-center rounded-[26px] font-bold text-ink bg-yellow whitespace-nowrap"
            style={{
              fontSize: 'clamp(20px, 2.5vw, 48px)',
              lineHeight: '1',
              paddingTop: '24px',
              paddingBottom: '24px',
              paddingLeft: 'var(--spacing-s400)',
              paddingRight: 'var(--spacing-s400)',
              boxShadow: 'var(--shadow-btn)',
            }}
          >
            {data.ctaText}
          </a>
        </div>

      </div>
    </section>
  );
}
