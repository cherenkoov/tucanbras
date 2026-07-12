/**
 * Generates lib/notionSnapshot.json from live Notion data.
 * Run after updating content in Notion:
 *   npx tsx --env-file=.env.local scripts/snapshot-notion.ts
 */
import { writeFileSync } from 'fs'
import { join } from 'path'
import {
  getHeaderData, getHeroData, getAboutData, getComparisonData,
  getTutorsData, getCelpeBrasData, getPlansData, getFooterData,
  getFreeLessonModalData,
} from '../lib/notion'
import type { Locale } from '../types'

const LOCALES: Locale[] = ['ru', 'en', 'pt']

async function main() {
  const snapshot: Record<string, object> = {}

  for (const locale of LOCALES) {
    console.log(`Fetching ${locale}...`)
    const [header, hero, about, comparison, tutors, celpeBras, plans, footer, modal] =
      await Promise.all([
        getHeaderData(locale),
        getHeroData(locale),
        getAboutData(locale),
        getComparisonData(locale),
        getTutorsData(locale),
        getCelpeBrasData(locale),
        getPlansData(locale),
        getFooterData(locale),
        getFreeLessonModalData(locale),
      ])

    snapshot[locale] = { header, hero, about, comparison, tutors, celpeBras, plans, footer, modal }
    console.log(`  ✓ ${locale}: header="${header.nav0}"`)
  }

  const outPath = join(__dirname, '..', 'lib', 'notionSnapshot.json')
  writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf-8')
  console.log(`\nSnapshot saved to lib/notionSnapshot.json`)
}

main().catch(e => { console.error(e); process.exit(1) })
