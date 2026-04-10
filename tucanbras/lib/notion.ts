import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type {
  Locale,
  HeaderData, HeroData, AboutData, ComparisonData,
  TutorsData, CelpeBrasData, PlansData, FooterData,
} from '@/types'

// ─── Client ──────────────────────────────────────────────────────────────────

const notion = new Client({ auth: process.env.NOTION_TOKEN })

// ─── Data Source (collection) IDs ─────────────────────────────────────────────
// Use collection IDs (not database page IDs) for dataSources.query in v5+

const DS = {
  header:     'ca0467db-b849-4f50-9b84-674552459190',
  hero:       '85488e04-ab91-4ab6-ae75-036a3b8bba8b',
  about:      '57379dbf-0c6b-4e41-ae6b-130255c6d6e9',
  comparison: '59456564-1b8f-47c0-9d81-69746fbd8252',
  tutors:     '111e5c3d-c6be-486e-a1d1-0d7b846873fd',
  celpeBras:  '767b519e-e318-4e02-b64f-c08f4b3957b1',
  footer:     '04e13201-1cbb-445a-ae3b-d2b8daf31fc5',
  plans:      '5e15c263-ca6e-43d5-84cd-302b8ddabea0',
  faq:        '3ec80b2a-3d65-4d5d-aabf-b061efbb2eb3',
}

// ─── Query helpers ────────────────────────────────────────────────────────────

async function queryLocale(
  dsId: string,
  locale: Locale,
  sortProp?: string,
): Promise<PageObjectResponse[]> {
  const res = await (notion.dataSources as any).query({
    data_source_id: dsId,
    filter: { property: 'locale', select: { equals: locale } },
    sorts: sortProp ? [{ property: sortProp, direction: 'ascending' }] : undefined,
  })
  return (res.results ?? []).filter(
    (r: any): r is PageObjectResponse => r.object === 'page' && 'properties' in r,
  )
}

// ─── Property extractors ──────────────────────────────────────────────────────

function pt(page: PageObjectResponse, key: string): string {
  const p = page.properties[key]
  if (!p) return ''
  if (p.type === 'title')     return p.title.map(t => t.plain_text).join('')
  if (p.type === 'rich_text') return p.rich_text.map(t => t.plain_text).join('')
  if (p.type === 'select')    return p.select?.name ?? ''
  return ''
}

function pn(page: PageObjectResponse, key: string): number {
  const p = page.properties[key]
  return p?.type === 'number' ? (p.number ?? 0) : 0
}

function pa(page: PageObjectResponse, key: string): string[] {
  return pt(page, key).split(' | ').filter(Boolean)
}

// ─── Section getters ──────────────────────────────────────────────────────────

export async function getHeaderData(locale: Locale): Promise<HeaderData> {
  const [row] = await queryLocale(DS.header, locale)
  if (!row) return { nav0: '', nav1: '', nav2: '', nav3: '' }
  return {
    nav0: pt(row, 'nav0'),
    nav1: pt(row, 'nav1'),
    nav2: pt(row, 'nav2'),
    nav3: pt(row, 'nav3'),
  }
}

export async function getHeroData(locale: Locale): Promise<HeroData> {
  const [row] = await queryLocale(DS.hero, locale)
  if (!row) return { heading1: '', heading2: '', ctaText: '', ctaHref: '#' }
  return {
    heading1: pt(row, 'heading1'),
    heading2: pt(row, 'heading2'),
    ctaText:  pt(row, 'ctaText'),
    ctaHref:  '#',
  }
}

export async function getAboutData(locale: Locale): Promise<AboutData> {
  const [row] = await queryLocale(DS.about, locale)
  if (!row) return { message1: '', description: '', message2: '', ctaText: '', ctaHref: '#' }
  return {
    message1:    pt(row, 'message1'),
    description: pt(row, 'description'),
    message2:    pt(row, 'message2'),
    ctaText:     pt(row, 'ctaText'),
    ctaHref:     '#',
  }
}

export async function getComparisonData(locale: Locale): Promise<ComparisonData> {
  const [row] = await queryLocale(DS.comparison, locale)
  if (!row) return { heading: '', tucanTitle: '', schoolTitle: '', tucanPros: [], schoolCons: [], summaryText: '' }
  return {
    heading:     pt(row, 'heading'),
    tucanTitle:  pt(row, 'tucanTitle'),
    schoolTitle: pt(row, 'schoolTitle'),
    tucanPros:   pa(row, 'tucanPros'),
    schoolCons:  pa(row, 'schoolCons'),
    summaryText: pt(row, 'summaryText'),
  }
}

export async function getTutorsData(locale: Locale): Promise<TutorsData> {
  const [row] = await queryLocale(DS.tutors, locale)
  if (!row) return { heading1: '', heading2: '', description: '', ctaText: '', ctaHref: '#' }
  return {
    heading1:    pt(row, 'heading1'),
    heading2:    pt(row, 'heading2'),
    description: pt(row, 'description'),
    ctaText:     pt(row, 'ctaText'),
    ctaHref:     '#',
  }
}

export async function getCelpeBrasData(locale: Locale): Promise<CelpeBrasData> {
  const [row] = await queryLocale(DS.celpeBras, locale)
  if (!row) return { heading: '', cards: [], quote: '', hintText: '', ctaText: '', ctaHref: '#' }
  return {
    heading:  pt(row, 'heading'),
    cards:    pa(row, 'cards'),
    quote:    pt(row, 'quote'),
    hintText: pt(row, 'hintText'),
    ctaText:  pt(row, 'ctaText'),
    ctaHref:  '#',
  }
}

export async function getPlansData(locale: Locale): Promise<PlansData> {
  const rows = await queryLocale(DS.plans, locale, 'order')
  const plans = rows.map(row => ({
    name:        pt(row, 'name'),
    priceAmount: pt(row, 'priceAmount'),
    pricePeriod: pt(row, 'pricePeriod'),
    subtitle:    pt(row, 'subtitle'),
    features:    pa(row, 'features'),
    ctaText:     pt(row, 'ctaText'),
    ctaHref:     '#',
  }))
  return {
    heading1: rows[0] ? pt(rows[0], 'heading1') : '',
    heading2: rows[0] ? pt(rows[0], 'heading2') : '',
    plans,
  }
}

export async function getFooterData(locale: Locale): Promise<FooterData> {
  const [[footerRow], faqRows] = await Promise.all([
    queryLocale(DS.footer, locale),
    queryLocale(DS.faq, locale),
  ])

  // Group FAQ rows by `group` number, preserving insertion order
  const groupMap = new Map<number, { title: string; items: { question: string; answer: string }[] }>()
  for (const row of faqRows) {
    const g = pn(row, 'group')
    if (!groupMap.has(g)) groupMap.set(g, { title: pt(row, 'groupTitle'), items: [] })
    groupMap.get(g)!.items.push({ question: pt(row, 'question'), answer: pt(row, 'answer') })
  }
  const faqGroups = Array.from(groupMap.values())

  const POLICY_LABELS: Record<Locale, string[]> = {
    ru: ['Пользовательское соглашение', 'Политика конфиденциальности', 'Условия оплаты', 'Обработка персональных данных'],
    en: ['Terms of Use', 'Privacy Policy', 'Payment Terms', 'Personal Data Processing'],
    pt: ['Termos de Uso', 'Política de Privacidade', 'Condições de Pagamento', 'Processamento de Dados Pessoais'],
  }

  const base = {
    faqGroups,
    policyLinks: POLICY_LABELS[locale].map(label => ({ label, href: '#' })),
    socialLinks: [
      { label: 'Telegram',  href: '#', iconUrl: 'https://www.figma.com/api/mcp/asset/27b31bd7-f182-47d7-ae9e-9acade205d8a' },
      { label: 'Instagram', href: '#', iconUrl: 'https://www.figma.com/api/mcp/asset/7a2fa6f9-24eb-422b-85e2-2416fe702e8e' },
      { label: 'YouTube',   href: '#', iconUrl: 'https://www.figma.com/api/mcp/asset/912addad-310a-496c-ac10-3abd39e0397f' },
    ],
  }

  if (!footerRow) return {
    formTitle: '', formNamePlaceholder: '', formTelegramPlaceholder: '',
    formSubmitText: '', brandDescription: '', legalTitle: '',
    copyright: '', allRightsReserved: '',
    ...base,
  }

  return {
    formTitle:               pt(footerRow, 'formTitle'),
    formNamePlaceholder:     pt(footerRow, 'formNamePlaceholder'),
    formTelegramPlaceholder: pt(footerRow, 'formTelegramPlaceholder'),
    formSubmitText:          pt(footerRow, 'formSubmitText'),
    brandDescription:        pt(footerRow, 'brandDescription'),
    legalTitle:              pt(footerRow, 'legalTitle'),
    copyright:               pt(footerRow, 'copyright'),
    allRightsReserved:       pt(footerRow, 'allRightsReserved'),
    ...base,
  }
}
