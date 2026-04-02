import { CelpeBrasProps } from "@/types";

export default function CelpeBras({ data }: CelpeBrasProps) {
  return (
    <section id="celpe-bras">
      {/* TODO: implement per Figma */}
      <h2>{data.heading}</h2>
      <div>
        {data.cards.map((card, i) => (
          <div key={i}>
            <h3>{card.title}</h3>
            <p>{card.description}</p> {/* TODO: TBD — card content not defined */}
          </div>
        ))}
      </div>
      <blockquote>{data.quote}</blockquote>
      <p>{data.descriptionLine}</p>
      <a href={data.ctaHref}>{data.ctaText}</a> {/* TODO: TBD — CTA destination */}
    </section>
  );
}
