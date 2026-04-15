import pool from './db'
import { resolveLanguage, type Language } from './languages'
import type { Locale } from '@/types'

export interface Tutor {
  id: number
  fullName: string
  imageUrl: string | null
  languages: Language[]
  quote: string | null
  specializations: string[]
  interests: string[]
}

type TutorRow = {
  id: number
  fullName: string
  fullName_en: string | null
  fullName_pt: string | null
  image: string | null
  languages: { code?: string; flag?: string; name?: string }[] | null
  quote: string | null
  quote_en: string | null
  quote_pt: string | null
  specializations: string[] | null
  specializations_en: string[] | null
  specializations_pt: string[] | null
  interests: string[] | null
  interests_en: string[] | null
  interests_pt: string[] | null
}

function pick(ru: string | null, en: string | null, pt: string | null, locale: Locale): string | null {
  if (locale === 'en') return en || ru
  if (locale === 'pt') return pt || ru
  return ru
}

function pickArr(ru: string[] | null, en: string[] | null, pt: string[] | null, locale: Locale): string[] {
  if (locale === 'en') return en?.length ? en : (ru ?? [])
  if (locale === 'pt') return pt?.length ? pt : (ru ?? [])
  return ru ?? []
}

export async function getTutors(locale: Locale = 'en'): Promise<Tutor[]> {
  const { rows } = await pool.query<TutorRow>(`
    SELECT
      id, "fullName", "fullName_en", "fullName_pt", image, languages,
      quote, quote_en, quote_pt,
      specializations, specializations_en, specializations_pt,
      interests, interests_en, interests_pt
    FROM "TeacherAnketas"
    ORDER BY id ASC
  `)

  const botBaseUrl = process.env.BOT_BASE_URL ?? ''

  return rows.map(row => ({
    id:              row.id,
    fullName:        pick(row.fullName, row.fullName_en, row.fullName_pt, locale) ?? row.fullName,
    imageUrl:        row.image ? `${botBaseUrl}/static/${row.image}` : null,
    languages:       (row.languages ?? []).map(resolveLanguage),
    quote:           pick(row.quote, row.quote_en, row.quote_pt, locale),
    specializations: pickArr(row.specializations, row.specializations_en, row.specializations_pt, locale),
    interests:       pickArr(row.interests, row.interests_en, row.interests_pt, locale),
  }))
}
