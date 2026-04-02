import { HeroProps } from "@/types";

export default function Hero({ data }: HeroProps) {
  return (
    <section id="hero">
      {/* TODO: implement per Figma */}
      <h1>{data.heading}</h1>
      <a href={data.ctaHref}>{data.ctaText}</a> {/* TODO: TBD — CTA destination */}
    </section>
  );
}
