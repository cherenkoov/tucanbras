import pool from './db'
import { resolveLanguage, type Language } from './languages'
import { normalizeImageUrl } from './driveImage'
import { translateTags } from './tagTranslations'
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
  imageUrl: string | null
  languages: { code?: string; flag?: string; name?: string }[] | null
  quote: string | null
  quote_en: string | null
  quote_pt: string | null
  specializations: string[] | null
  interests: string[] | null
}

function pick(ru: string | null, en: string | null, pt: string | null, locale: Locale): string | null {
  if (locale === 'en') return en || ru
  if (locale === 'pt') return pt || ru
  return ru
}

export async function getTutors(locale: Locale = 'en'): Promise<Tutor[]> {
  // Только одобренные анкеты (Фаза 1 модерации). Переводы свободного текста
  // лежат в _en/_pt колонках (заполняет админ), теги переводятся словарём.
  const { rows } = await pool.query<TutorRow>(`
    SELECT
      id, "fullName", "fullName_en", "fullName_pt",
      image, "imageUrl", languages,
      quote, quote_en, quote_pt,
      specializations, interests
    FROM "TeacherAnketa"
    WHERE status = 'approved'
    ORDER BY id ASC
  `)

  const botBaseUrl = process.env.BOT_BASE_URL ?? ''

  return rows.map(row => ({
    id:              row.id,
    fullName:        pick(row.fullName, row.fullName_en, row.fullName_pt, locale) ?? row.fullName,
    imageUrl:        normalizeImageUrl(row.imageUrl ?? (row.image ? `${botBaseUrl}/static/${row.image}` : null)),
    languages:       (row.languages ?? []).map(resolveLanguage),
    quote:           pick(row.quote, row.quote_en, row.quote_pt, locale),
    specializations: translateTags(row.specializations, locale),
    interests:       translateTags(row.interests, locale),
  }))
}
