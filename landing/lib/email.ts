import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM ?? 'TucanBRAS <no-reply@tucanbras.com>'

const TG_APP_STORE   = 'https://apps.apple.com/app/telegram-messenger/id686449807'
const TG_GOOGLE_PLAY = 'https://play.google.com/store/apps/details?id=org.telegram.messenger'

// ─── Per-locale content ───────────────────────────────────────────────────────

interface Strings {
  subject:        string
  greeting:       string
  intro:          string
  whatAwaits:     string
  bullets:        string[]
  tgNotice:       string
  tgCta:          string
  appStore:       string
  googlePlay:     string
  closing:        string
  team:           string
}

function getStrings(locale: string, name: string): Strings {
  const s: Record<string, Strings> = {
    ru: {
      subject:    `Добро пожаловать в TucanBRAS, ${name}!`,
      greeting:   `Привет, ${name}!`,
      intro:      'Ты оставил заявку в <strong>TucanBRAS</strong> — онлайн-школе бразильского португальского. Рады, что ты здесь.',
      whatAwaits: 'Что тебя ждёт:',
      bullets: [
        'Занятия с носителями языка прямо из Бразилии',
        'Живая речь и культура — без учебникового пластика',
        'Подготовка к международному экзамену CELPE-BRAS',
        'Форматы от одного пробного урока до полного курса',
      ],
      tgNotice:   'Важно: наша школа полностью работает в <strong>Telegram</strong> — там проходят уроки, общение с репетиторами и все материалы.',
      tgCta:      'Если Telegram ещё не установлен, скачай его:',
      appStore:   'App Store',
      googlePlay: 'Google Play',
      closing:    'Скоро с тобой свяжется репетитор. До встречи в Бразилии!',
      team:       'Команда TucanBRAS',
    },
    en: {
      subject:    `Welcome to TucanBRAS, ${name}!`,
      greeting:   `Hi, ${name}!`,
      intro:      'You\'ve submitted a request to <strong>TucanBRAS</strong> — an online school of Brazilian Portuguese. We\'re glad you\'re here.',
      whatAwaits: 'What\'s ahead:',
      bullets: [
        'Lessons with native speakers straight from Brazil',
        'Real speech and culture — no textbook clichés',
        'Preparation for the international CELPE-BRAS exam',
        'Formats from a single trial lesson to a full course',
      ],
      tgNotice:   'Important: our school runs entirely in <strong>Telegram</strong> — lessons, tutor communication, and all materials happen there.',
      tgCta:      'If you don\'t have Telegram yet, download it:',
      appStore:   'App Store',
      googlePlay: 'Google Play',
      closing:    'A tutor will reach out to you soon. See you in Brazil!',
      team:       'The TucanBRAS Team',
    },
    pt: {
      subject:    `Bem-vindo ao TucanBRAS, ${name}!`,
      greeting:   `Olá, ${name}!`,
      intro:      'Você enviou uma solicitação para o <strong>TucanBRAS</strong> — escola online de português brasileiro. Que bom ter você aqui.',
      whatAwaits: 'O que esperar:',
      bullets: [
        'Aulas com falantes nativos direto do Brasil',
        'Fala real e cultura viva — sem o plástico dos livros didáticos',
        'Preparação para o exame internacional CELPE-BRAS',
        'Formatos de uma aula experimental a um curso completo',
      ],
      tgNotice:   'Importante: nossa escola funciona inteiramente no <strong>Telegram</strong> — aulas, comunicação com tutores e todo o material estão lá.',
      tgCta:      'Se você ainda não tem o Telegram, baixe-o:',
      appStore:   'App Store',
      googlePlay: 'Google Play',
      closing:    'Um tutor entrará em contato em breve. Até o Brasil!',
      team:       'A equipe TucanBRAS',
    },
  }
  return s[locale] ?? s.ru
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildHtml(s: Strings): string {
  const bullets = s.bullets
    .map(b => `<tr><td style="padding:4px 0;color:#323031;font-size:16px;line-height:1.5;"><span style="color:#7CB082;margin-right:8px;">✓</span>${b}</td></tr>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFCE5;border-radius:24px;overflow:hidden;">

      <tr><td style="background:#323031;padding:28px 36px;">
        <span style="font-size:22px;font-weight:bold;color:#FFFCE5;letter-spacing:0.06em;">TUCANBRAS</span>
      </td></tr>

      <tr><td style="padding:36px 36px 0 36px;">
        <h1 style="margin:0 0 16px;font-size:26px;color:#323031;line-height:1.2;">${s.greeting}</h1>
        <p style="margin:0 0 24px;font-size:16px;color:#323031;line-height:1.6;">${s.intro}</p>

        <p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:#323031;">${s.whatAwaits}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${bullets}</table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#7CB082;border-radius:16px;margin-bottom:28px;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 12px;font-size:15px;color:#FFFCE5;line-height:1.5;">${s.tgNotice}</p>
            <p style="margin:0 0 14px;font-size:15px;color:#FFFCE5;">${s.tgCta}</p>
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:8px;"><a href="${TG_APP_STORE}" style="display:inline-block;background:#FFFCE5;color:#323031;font-size:13px;font-weight:bold;padding:8px 16px;border-radius:8px;text-decoration:none;">${s.appStore}</a></td>
              <td><a href="${TG_GOOGLE_PLAY}" style="display:inline-block;background:#FFFCE5;color:#323031;font-size:13px;font-weight:bold;padding:8px 16px;border-radius:8px;text-decoration:none;">${s.googlePlay}</a></td>
            </tr></table>
          </td></tr>
        </table>

        <p style="margin:0 0 6px;font-size:16px;color:#323031;">${s.closing}</p>
        <p style="margin:0;font-size:16px;font-weight:bold;color:#323031;">${s.team}</p>
      </td></tr>

      <tr><td style="padding:20px 36px;border-top:1px solid rgba(50,48,49,0.12);">
        <p style="margin:0;font-size:12px;color:#323031;opacity:0.45;">© 2025 TucanBRAS</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string, locale: string): Promise<void> {
  const s = getStrings(locale, name)
  await resend.emails.send({ from: FROM, to, subject: s.subject, html: buildHtml(s) })
}
