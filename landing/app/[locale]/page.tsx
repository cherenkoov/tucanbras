export const revalidate = 3600 // ISR: обновлять кэш раз в час

import type { Locale } from '@/types'
import { LOCALES } from '@/lib/locales'
import Header from '@/components/sections/Header'
import Hero from '@/components/sections/Hero'
import About from '@/components/sections/About'
import Comparison from '@/components/sections/Comparison'
import Tutors from '@/components/sections/Tutors'
import CelpeBras from '@/components/sections/CelpeBras'
import Plans from '@/components/sections/Plans'
import Footer from '@/components/sections/Footer'

import AnchorScrollHandler from '@/components/ui/AnchorScrollHandler'
import BackgroundCanvas from '@/components/ui/background/BackgroundCanvas'
import GlassCenterActivation from '@/components/ui/GlassCenterActivation'
import NotionRetry from '@/components/ui/NotionRetry'
import ScrollDebug from '@/components/ui/ScrollDebug'
import { getTutors } from '@/lib/tutors'
import { getStubTutors } from '@/lib/tutorStubs'
import {
  getHeaderData,
  getHeroData,
  getAboutData,
  getComparisonData,
  getTutorsData,
  getCelpeBrasData,
  getPlansData,
  getFooterData,
  getFreeLessonModalData,
} from '@/lib/notion'
import snapshot from '@/lib/notionSnapshot.json'

// Anchor hrefs are structural — labels come from Notion
const NAV_HREFS = ['#about', '#tutors', '#celpe-bras', '#plans']

// Trial-lesson price word — no Notion field, localized inline
const FREE_LABEL: Record<Locale, string> = { ru: 'бесплатно', en: 'free', pt: 'grátis' }

export function generateStaticParams() {
  return LOCALES.map(locale => ({ locale }))
}

const VALID_LOCALES = new Set<string>(LOCALES)

export default async function Home({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  if (!VALID_LOCALES.has(locale)) {
    const { notFound } = await import('next/navigation')
    notFound()
  }

  const [notionHeader, notionHero, notionAbout, notionComparison, notionTutors] = await Promise.all([
    getHeaderData(locale),
    getHeroData(locale),
    getAboutData(locale),
    getComparisonData(locale),
    getTutorsData(locale),
  ])

  const [notionCelpeBras, notionPlans, notionFooter, notionModal, tutors] = await Promise.all([
    getCelpeBrasData(locale),
    getPlansData(locale),
    getFooterData(locale),
    getFreeLessonModalData(locale),
    getTutors(locale).catch(() => []),
  ])

  const notionFailed = !notionHeader.nav0
  const snap = (snapshot as Record<string, typeof snapshot.ru>)[locale]

  // Per-section fallback. A PARTIAL Notion response (header OK, but some other row empty or
  // missing) sails past the coarse notionFailed flag and blanks that section — that is exactly
  // how CELPE-BRAS lost its heading/hint (2026-07-19). So each section independently falls back
  // to the snapshot when its own primary field is empty. The snapshot is the source of truth we
  // are migrating to; live Notion only wins when it actually returned content for that section.
  const headerData    = notionFailed ? snap.header : notionHeader
  const heroData      = notionFailed || !notionHero.heading1      ? snap.hero       : notionHero
  const aboutData     = notionFailed || !notionAbout.message1     ? snap.about      : notionAbout
  const comparisonData = notionFailed || !notionComparison.heading ? snap.comparison : notionComparison
  const tutorsData    = notionFailed || !notionTutors.heading1    ? snap.tutors     : notionTutors
  const celpeBrasData = notionFailed || !notionCelpeBras.heading  ? snap.celpeBras  : notionCelpeBras
  const plansData     = notionFailed || notionPlans.plans.length === 0 ? snap.plans : notionPlans
  const footerData    = notionFailed ? snap.footer : notionFooter
  const modalStrings  = notionFailed || !notionModal.title        ? snap.modal      : notionModal

  const displayTutors = tutors.length > 0 ? tutors : getStubTutors(locale)

  const navLinks = NAV_HREFS.map((href, i) => ({
    href,
    label: headerData[`nav${i}` as keyof typeof headerData],
  }))

  return (
    <div className="relative" style={{ overflow: 'clip' }}>
      {notionFailed && <NotionRetry />}
      <AnchorScrollHandler />
      {/* Mobile: fire glass hover when a surface scrolls into the viewport centre */}
      <GlassCenterActivation />
      {/* Crash-point probe — active only with ?debug=1 in the URL */}
      <ScrollDebug />
      {/* Background — absolute, anchored to page top */}
      <BackgroundCanvas />
      {/* 1 — fixed, вне main (не блюрится), z-50 */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-[43px] px-s600 lg:px-[var(--spacing-landing-x)]">
        <Header navLinks={navLinks} />
      </div>
      {/* Компенсация высоты fixed хедера */}
      <main className="relative z-10 px-[var(--page-x)] pt-[128px] lg:pt-[139px] pb-[24px] lg:pb-[60px]" style={{ overflowX: 'clip' }}>
        <div className="max-w-[1440px] mx-auto flex flex-col gap-[80px]">
          {/* 2 */}
          <Hero data={heroData} />
          {/* 3 */}
          <About data={aboutData} />
          {/* 4 */}
          <Comparison data={comparisonData} />
          {/* 5 */}
          <Tutors data={tutorsData} tutors={tutors} locale={locale} modalStrings={modalStrings} />
          {/* WaveSection moved into BackgroundCanvas (behind the beach) — no longer a section */}
          {/* 6 */}
          <CelpeBras data={celpeBrasData} />
          {/* 7 */}
          <Plans data={plansData} />
          {/* 8 */}
          <Footer
              data={footerData}
              tutors={displayTutors}
              planNames={[footerData.formFreeLessonOption, ...plansData.plans.map(p => p.name)]}
              planPrices={{
                [footerData.formFreeLessonOption]: FREE_LABEL[locale],
                ...Object.fromEntries(plansData.plans.map(p => [p.name, p.priceAmount + p.pricePeriod])),
              }}
              locale={locale}
            />
        </div>
      </main>
    </div>
  )
}
