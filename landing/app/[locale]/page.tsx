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
} from '@/lib/content'

// Anchor hrefs are structural — labels come from the CMS
const NAV_HREFS = ['#about', '#tutors', '#celpe-bras', '#plans']

// Trial-lesson price word — no CMS field, localized inline
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

  const [headerData, heroData, aboutData, comparisonData, tutorsData] = await Promise.all([
    getHeaderData(locale),
    getHeroData(locale),
    getAboutData(locale),
    getComparisonData(locale),
    getTutorsData(locale),
  ])

  const [celpeBrasData, plansData, footerData, tutors] = await Promise.all([
    getCelpeBrasData(locale),
    getPlansData(locale),
    getFooterData(locale),
    getTutors(locale).catch(() => []),
  ])

  const displayTutors = tutors.length > 0 ? tutors : getStubTutors(locale)

  // Одна строка на два места: первый пункт списка тарифов в футер-форме И значение,
  // которым hero-CTA стреляет в `plan-selected`. FooterForm принимает событие только
  // если тариф есть в `planNames`, так что разъехаться им нельзя. Пофайловый фолбэк
  // на снапшот теперь внутри `lib/content.ts` — сюда поле приходит уже разрешённым.
  const trialPlanName = footerData.formFreeLessonOption

  const navLinks = NAV_HREFS.map((href, i) => ({
    href,
    label: headerData[`nav${i}` as keyof typeof headerData],
  }))

  return (
    <div className="relative" style={{ overflow: 'clip' }}>
      <AnchorScrollHandler />
      {/* Mobile: fire glass hover when a surface scrolls into the viewport centre */}
      <GlassCenterActivation />
      {/* Crash-point probe — active only with ?debug=1 in the URL */}
      <ScrollDebug />
      {/* Background — absolute, anchored to page top */}
      <BackgroundCanvas />
      {/* 1 — fixed, вне main (не блюрится), z-50 */}
      {/* Desktop sits 17px lower than mobile: the header drum parks a pill one 60px
          step ABOVE its slot, and 43px + the nav's own 12px left it 5px short — the
          pill's rounded top got shaved by the viewport edge. 60px puts it at y=12.
          Every anchor offset below is derived from this: main's padding, HEADER_OFFSET
          in useActiveSection, scrollToElement's headerOffset, and each section's
          lg:scroll-mt. Move one, move all six. */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-[43px] lg:pt-[60px] px-s600 lg:px-[var(--spacing-landing-x)]">
        <Header navLinks={navLinks} locale={locale} />
      </div>
      {/* Компенсация высоты fixed хедера */}
      <main className="relative z-10 px-[var(--page-x)] pt-[128px] lg:pt-[156px] pb-[24px] lg:pb-[60px]" style={{ overflowX: 'clip' }}>
        <div className="max-w-[1440px] mx-auto flex flex-col gap-[80px]">
          {/* 2 */}
          <Hero data={heroData} trialPlanName={trialPlanName} locale={locale} />
          {/* 3 */}
          <About data={aboutData} />
          {/* 4 */}
          <Comparison data={comparisonData} />
          {/* 5 */}
          <Tutors data={tutorsData} tutors={tutors} locale={locale} />
          {/* WaveSection moved into BackgroundCanvas (behind the beach) — no longer a section */}
          {/* 6 */}
          <CelpeBras data={celpeBrasData} locale={locale} />
          {/* 7 */}
          <Plans data={plansData} locale={locale} />
          {/* 8 */}
          <Footer
              data={footerData}
              tutors={displayTutors}
              planNames={[trialPlanName, ...plansData.plans.map(p => p.name)]}
              planPrices={{
                [trialPlanName]: FREE_LABEL[locale],
                ...Object.fromEntries(plansData.plans.map(p => [p.name, p.priceAmount + p.pricePeriod])),
              }}
              locale={locale}
            />
        </div>
      </main>
    </div>
  )
}
