import { cache } from 'react'
import pool from '@/lib/db'
import { resolveSection } from '@/lib/contentResolve'
import snapshot from '@/lib/contentSnapshot.json'
import type {
  Locale,
  HeaderData, HeroData, AboutData, ComparisonData,
  TutorsData, CelpeBrasData, PlansData, FooterData,
} from '@/types'

// ─── Снапшот ─────────────────────────────────────────────────────────────────
// Запечённая копия контента — фолбэк, когда БД недоступна или строки ещё нет.
// Благодаря ему `next build` проходит с выключенным Postgres.

type Snapshot = typeof snapshot
type SectionKey = keyof Snapshot['ru']

function snap(locale: Locale) {
  return (snapshot as Snapshot)[locale] ?? (snapshot as Snapshot).ru
}

// ─── Чтение из БД ────────────────────────────────────────────────────────────

/**
 * Все секции одной локали одним запросом. `cache` из React дедуплицирует
 * вызовы внутри одного рендера: page.tsx дёргает восемь геттеров, а в БД
 * уходит один SELECT.
 *
 * Ошибка БД не бросается наружу — она означает лишь то, что страница
 * соберётся на снапшоте.
 */
const loadLocale = cache(async (locale: Locale): Promise<Record<string, unknown>> => {
  try {
    const { rows } = await pool.query<{ section: string; data: unknown }>(
      'SELECT section, data FROM "LandingContents" WHERE locale = $1',
      [locale],
    )

    const bySection: Record<string, unknown> = {}
    for (const row of rows) bySection[row.section] = row.data
    return bySection
  } catch (e) {
    console.error('[content] Postgres недоступен, отдаём снапшот:', (e as Error).message)
    return {}
  }
})

async function getSection<K extends SectionKey>(
  section: K,
  locale: Locale,
): Promise<Snapshot['ru'][K]> {
  const all = await loadLocale(locale)
  const fallback = snap(locale)[section] as Snapshot['ru'][K]
  return resolveSection(all[section], fallback as object) as Snapshot['ru'][K]
}

// ─── Геттеры секций ──────────────────────────────────────────────────────────
// Сигнатуры повторяют старый lib/notion.ts один в один: page.tsx меняет только
// путь импорта. ctaHref в CMS не хранится — на лендинге все CTA якорные.

export async function getHeaderData(locale: Locale): Promise<HeaderData> {
  return await getSection('header', locale) as HeaderData
}

export async function getHeroData(locale: Locale): Promise<HeroData> {
  const data = await getSection('hero', locale) as HeroData
  return { ...data, ctaHref: '#' }
}

export async function getAboutData(locale: Locale): Promise<AboutData> {
  const data = await getSection('about', locale) as AboutData
  return { ...data, ctaHref: '#' }
}

export async function getComparisonData(locale: Locale): Promise<ComparisonData> {
  return await getSection('comparison', locale) as ComparisonData
}

export async function getTutorsData(locale: Locale): Promise<TutorsData> {
  const data = await getSection('tutors', locale) as TutorsData
  return { ...data, ctaHref: '#' }
}

export async function getCelpeBrasData(locale: Locale): Promise<CelpeBrasData> {
  const data = await getSection('celpeBras', locale) as CelpeBrasData
  return { ...data, ctaHref: '#' }
}

export async function getPlansData(locale: Locale): Promise<PlansData> {
  const data = await getSection('plans', locale) as PlansData
  return {
    ...data,
    plans: (data.plans ?? []).map(plan => ({ ...plan, ctaHref: '#' })),
  }
}

export async function getFooterData(locale: Locale): Promise<FooterData> {
  return await getSection('footer', locale) as FooterData
}
