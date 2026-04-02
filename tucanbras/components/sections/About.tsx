import { AboutProps } from "@/types";

export default function About({ data }: AboutProps) {
  return (
    <section id="about">
      {/* TODO: implement per Figma */}
      <div>{data.block1}</div>
      <div>{data.block2}</div>
      <button type="button">{data.ctaText}</button> {/* TODO: expand additional content */}
    </section>
  );
}
