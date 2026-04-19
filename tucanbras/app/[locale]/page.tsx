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

// Anchor hrefs are structural — labels come from Notion
const NAV_HREFS = ['#about', '#tutors', '#celpe-bras', '#plans']

export function generateStaticParams() {
  return [{ locale: 'ru' }, { locale: 'en' }, { locale: 'pt' }]
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  const [
    headerData,
    heroData,
    aboutData,
    comparisonData,
    tutorsData,
    celpeBrasData,
    plansData,
    footerData,
    tutors,
    modalStrings,
  ] = await Promise.all([
    getHeaderData(locale),
    getHeroData(locale),
    getAboutData(locale),
    getComparisonData(locale),
    getTutorsData(locale),
    getCelpeBrasData(locale),
    getPlansData(locale),
    getFooterData(locale),
    getTutors(locale).catch(() => []),
    getFreeLessonModalData(locale),
  ])

  const displayTutors = tutors.length > 0 ? tutors : getStubTutors(locale)

  const navLinks = NAV_HREFS.map((href, i) => ({
    href,
    label: headerData[`nav${i}` as keyof typeof headerData],
  }))

  return (
    <>
      <AnchorScrollHandler />
      {/* 1 — fixed, вне main (не блюрится), z-50 */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-[43px] px-s600 lg:px-[var(--spacing-landing-x)]">
        <Header navLinks={navLinks} />
      </div>
      {/* Компенсация высоты fixed хедера */}
      <main className="px-s600 lg:px-[var(--spacing-landing-x)] pt-[128px] lg:pt-[139px]">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-[80px]">
          {/* 2 */}
          <Hero data={heroData} />
          {/* 3 */}
          <About data={aboutData} />
          {/* 4 */}
          <Comparison data={comparisonData} />
          {/* 5 */}
          <Tutors data={tutorsData} tutors={tutors} locale={locale} modalStrings={modalStrings} />
          {/* 6 */}
          <CelpeBras data={celpeBrasData} />
          {/* 7 */}
          <Plans data={plansData} />
          {/* 8 */}
          <Footer
              data={footerData}
              tutors={displayTutors}
              planNames={[footerData.formFreeLessonOption, ...plansData.plans.map(p => p.name)]}
              locale={locale}
            />
        </div>
      </main>
    </>
  )
}
