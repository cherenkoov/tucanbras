import pool from './db'
import { resolveLanguage, type Language } from './languages'

export interface Tutor {
  id: number
  fullName: string
  imageUrl: string | null
  languages: Language[]
  quote: string | null
  specializations: string[]
  interests: string[]
}

export async function getTutors(): Promise<Tutor[]> {
  const { rows } = await pool.query<{
    id: number
    fullName: string
    image: string | null
    languages: { code?: string; flag?: string; name?: string }[] | null
    quote: string | null
    specializations: string[] | null
    interests: string[] | null
  }>(`
    SELECT id, "fullName", image, languages, quote, specializations, interests
    FROM "TeacherAnketas"
    ORDER BY id ASC
  `)

  const botBaseUrl = process.env.BOT_BASE_URL ?? ''

  return rows.map(row => ({
    id:              row.id,
    fullName:        row.fullName,
    imageUrl:        row.image ? `${botBaseUrl}/static/${row.image}` : null,
    languages:       (row.languages ?? []).map(resolveLanguage),
    quote:           row.quote ?? null,
    specializations: row.specializations ?? [],
    interests:       row.interests ?? [],
  }))
}
