import type { Config } from '@netlify/functions'
import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { Pool } from 'pg'

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DB_ID  = process.env.NOTION_TEACHERS_DB_ID!

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getText(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  if (!p) return null
  if (p.type === 'title')     return p.title.map(t => t.plain_text).join('') || null
  if (p.type === 'rich_text') return p.rich_text.map(t => t.plain_text).join('') || null
  return null
}

function getNumber(page: PageObjectResponse, key: string): number | null {
  const p = page.properties[key]
  return p?.type === 'number' ? p.number : null
}

function getSelect(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  return p?.type === 'select' ? (p.select?.name ?? null) : null
}

function getMultiSelect(page: PageObjectResponse, key: string): string[] {
  const p = page.properties[key]
  return p?.type === 'multi_select' ? p.multi_select.map(o => o.name) : []
}

function getUrl(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  return p?.type === 'url' ? p.url : null
}

function parseArr(text: string | null): string[] {
  if (!text) return []
  return text.split(' | ').filter(Boolean)
}

function parseContacts(page: PageObjectResponse): object[] {
  const methods = getMultiSelect(page, 'contactMethods')
  const linksText = getText(page, 'contactLinks') ?? '{}'
  let links: Record<string, string> = {}
  try { links = JSON.parse(linksText) } catch { links = {} }
  return methods.map(type => ({ type, value: links[type] ?? '' }))
}

function mapPageToRow(page: PageObjectResponse) {
  return {
    notionPageId:       page.id,
    fullName:           getText(page, 'fullName') ?? '',
    fullName_en:        getText(page, 'fullName_en'),
    fullName_pt:        getText(page, 'fullName_pt'),
    imageUrl:           getUrl(page, 'imageUrl'),
    gender:             getSelect(page, 'gender'),
    age:                getNumber(page, 'age'),
    timezone:           getText(page, 'timezone'),
    nativeLanguage:     getText(page, 'nativeLanguage'),
    languages:          JSON.stringify(getMultiSelect(page, 'languages').map(code => ({ code }))),
    experience:         getNumber(page, 'experience'),
    specializations:    JSON.stringify(getMultiSelect(page, 'specializations')),
    specializations_en: JSON.stringify(parseArr(getText(page, 'specializations_en'))),
    specializations_pt: JSON.stringify(parseArr(getText(page, 'specializations_pt'))),
    interests:          JSON.stringify(getMultiSelect(page, 'interests')),
    interests_en:       JSON.stringify(parseArr(getText(page, 'interests_en'))),
    interests_pt:       JSON.stringify(parseArr(getText(page, 'interests_pt'))),
    quote:              getText(page, 'quote'),
    quote_en:           getText(page, 'quote_en'),
    quote_pt:           getText(page, 'quote_pt'),
    contacts:           JSON.stringify(parseContacts(page)),
  }
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncTeachers() {
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  do {
    const res = await notion.dataSources.query({
      data_source_id: DB_ID,
      filter: { property: 'isPublished', checkbox: { equals: true } },
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...(res.results as PageObjectResponse[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  const notionIds = pages.map(p => p.id)
  let inserted = 0, deleted = 0

  for (const page of pages) {
    const row = mapPageToRow(page)
    await pool.query(
      `INSERT INTO "TeacherAnketas"
         ("notionPageId", "fullName", "fullName_en", "fullName_pt",
          "imageUrl", gender, age, timezone, "nativeLanguage",
          languages, experience,
          specializations, specializations_en, specializations_pt,
          interests, interests_en, interests_pt,
          quote, quote_en, quote_pt, contacts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT ("notionPageId") DO UPDATE SET
         "fullName"          = EXCLUDED."fullName",
         "fullName_en"       = EXCLUDED."fullName_en",
         "fullName_pt"       = EXCLUDED."fullName_pt",
         "imageUrl"          = EXCLUDED."imageUrl",
         gender              = EXCLUDED.gender,
         age                 = EXCLUDED.age,
         timezone            = EXCLUDED.timezone,
         "nativeLanguage"    = EXCLUDED."nativeLanguage",
         languages           = EXCLUDED.languages,
         experience          = EXCLUDED.experience,
         specializations     = EXCLUDED.specializations,
         specializations_en  = EXCLUDED.specializations_en,
         specializations_pt  = EXCLUDED.specializations_pt,
         interests           = EXCLUDED.interests,
         interests_en        = EXCLUDED.interests_en,
         interests_pt        = EXCLUDED.interests_pt,
         quote               = EXCLUDED.quote,
         quote_en            = EXCLUDED.quote_en,
         quote_pt            = EXCLUDED.quote_pt,
         contacts            = EXCLUDED.contacts`,
      [
        row.notionPageId, row.fullName, row.fullName_en, row.fullName_pt,
        row.imageUrl, row.gender, row.age, row.timezone, row.nativeLanguage,
        row.languages, row.experience,
        row.specializations, row.specializations_en, row.specializations_pt,
        row.interests, row.interests_en, row.interests_pt,
        row.quote, row.quote_en, row.quote_pt, row.contacts,
      ]
    )
    inserted++
  }

  if (notionIds.length > 0) {
    const res = await pool.query(
      `DELETE FROM "TeacherAnketas"
       WHERE "notionPageId" IS NOT NULL
         AND "notionPageId" != ALL($1::text[])
       RETURNING id`,
      [notionIds]
    )
    deleted = res.rowCount ?? 0
  }

  return { inserted, deleted, total: pages.length }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async () => {
  try {
    if (!DB_ID) {
      console.error('NOTION_TEACHERS_DB_ID не задан — пропускаем синк')
      return new Response('NOTION_TEACHERS_DB_ID missing', { status: 500 })
    }
    const result = await syncTeachers()
    console.log('Синк учителей завершён:', result)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('Синк учителей — ошибка:', message)
    return new Response(message, { status: 500 })
  }
}

export const config: Config = {
  schedule: '*/5 * * * *',
}
