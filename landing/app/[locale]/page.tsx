export const revalidate = 3600 // ISR: обновлять кэш раз в час

import type { Locale } from '@/types'
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
  return [{ locale: 'ru' }, { locale: 'en' }, { locale: 'pt' }]
}

const VALID_LOCALES = new Set(['ru', 'en', 'pt'])

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

  const headerData    = notionFailed ? snap.header    : notionHeader
  const heroData      = notionFailed ? snap.hero      : notionHero
  const aboutData     = notionFailed ? snap.about     : notionAbout
  const comparisonData = notionFailed ? snap.comparison : notionComparison
  const tutorsData    = notionFailed ? snap.tutors    : notionTutors
  const celpeBrasData = notionFailed ? snap.celpeBras : notionCelpeBras
  const plansData     = notionFailed ? snap.plans     : notionPlans
  const footerData    = notionFailed ? snap.footer    : notionFooter
  const modalStrings  = notionFailed ? snap.modal     : notionModal

  const displayTutors = tutors.length > 0 ? tutors : getStubTutors(locale)

  const navLinks = NAV_HREFS.map((href, i) => ({
    href,
    label: headerData[`nav${i}` as keyof typeof headerData],
  }))

  return (
    <div className="relative" style={{ overflowX: 'clip' }}>
      {notionFailed && <NotionRetry />}
      <AnchorScrollHandler />
      {/* Mobile: fire glass hover when a surface scrolls into the viewport centre */}
      <GlassCenterActivation />
      {/* Background — absolute, anchored to page top */}
      <BackgroundCanvas />
      {/* 1 — fixed, вне main (не блюрится), z-50 */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-[43px] px-s600 lg:px-[var(--spacing-landing-x)]">
        <Header navLinks={navLinks} />
      </div>
      {/* Компенсация высоты fixed хедера */}
      <main className="relative z-10 px-[var(--page-x)] pt-[128px] lg:pt-[139px]" style={{ overflowX: 'clip' }}>
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
