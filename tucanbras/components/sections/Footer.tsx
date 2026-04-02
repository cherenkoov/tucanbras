import { FooterProps } from "@/types";

export default function Footer({ data }: FooterProps) {
  return (
    <footer id="footer">
      {/* TODO: implement per Figma */}

      {/* Form */}
      <form>
        <input type="text" placeholder="Имя" />
        <input type="text" placeholder="Telegram" />
        <button type="submit">Отправить</button> {/* TODO: TBD — form submission handler */}
      </form>

      {/* Brand block */}
      <div>TucanBRAS</div>

      {/* FAQ */}
      {data.faqGroups.map((group, i) => (
        <div key={i}>
          <h3>{group.title}</h3>
          <ul>
            {group.items.map((item, j) => (
              <li key={j}>
                <strong>{item.question}</strong>
                <p>{item.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Policy links */}
      <nav>
        {data.policyLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>

      {/* Social links */}
      <nav>
        {data.socialLinks.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a> /* TODO: TBD — final URLs */
        ))}
      </nav>
    </footer>
  );
}
