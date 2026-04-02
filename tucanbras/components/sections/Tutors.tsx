import { TutorsProps } from "@/types";

export default function Tutors({ data }: TutorsProps) {
  return (
    <section id="tutors">
      {/* TODO: implement per Figma */}
      <h2>{data.heading1}</h2>
      <h3>{data.heading2}</h3>
      <p>{data.description}</p>
      <div>
        {data.tutors.map((tutor) => (
          <div key={tutor.name}>
            <h4>{tutor.name}</h4>
            <p>{tutor.languages.join(", ")}</p>
            <p>{tutor.description}</p>
            <ul>
              {tutor.specialtyTags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            {tutor.interestTags && (
              <ul>
                {tutor.interestTags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <a href={data.ctaHref}>{data.ctaText}</a> {/* TODO: TBD — CTA destination */}
    </section>
  );
}
