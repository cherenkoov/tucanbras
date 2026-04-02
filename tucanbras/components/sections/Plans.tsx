import { PlansProps } from "@/types";

export default function Plans({ data }: PlansProps) {
  return (
    <section id="plans">
      {/* TODO: implement per Figma */}
      <h2>{data.heading1}</h2>
      <h3>{data.heading2}</h3>
      <div>
        {data.plans.map((plan) => (
          <div key={plan.name}>
            <h4>{plan.name}</h4>
            <p>{plan.price}</p>
            {plan.description && <p>{plan.description}</p>}
            {plan.bullets && (
              <ul>
                {plan.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            )}
            <button type="button">{plan.ctaText}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
