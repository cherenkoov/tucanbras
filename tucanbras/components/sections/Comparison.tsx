import { ComparisonProps } from "@/types";

export default function Comparison({ data }: ComparisonProps) {
  return (
    <section id="comparison">
      {/* TODO: implement per Figma */}
      <h2>{data.heading}</h2>
      <div>
        <div>
          <h3>Наш тукан</h3>
          <ul>
            {data.tucanPros.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Обычные скучные школы</h3>
          <ul>
            {data.schoolCons.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      <p>{data.summaryText}</p>
    </section>
  );
}
