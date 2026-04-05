// Server component — assembles all sections in fixed order per CLAUDE.md.
// TODO: replace stub data with Notion API calls via lib/notion.ts

import Header, { NAV_LINKS } from "@/components/sections/Header";
import Hero from "@/components/sections/Hero";
import About from "@/components/sections/About";
import Comparison from "@/components/sections/Comparison";
import Tutors from "@/components/sections/Tutors";
import CelpeBras from "@/components/sections/CelpeBras";
import Plans from "@/components/sections/Plans";
import Footer from "@/components/sections/Footer";

import type {
  HeroData,
  AboutData,
  ComparisonData,
  TutorsData,
  CelpeBrasData,
  PlansData,
  FooterData,
} from "@/types";

// ─── Stub data — replace with Notion fetches ─────────────────────────────────

const heroData: HeroData = {
  heading1: "Учите португальский —",
  heading2: "и летите в Бразилию",
  ctaText: "Бесплатный урок",
  ctaHref: "#", // TODO: TBD
};

const aboutData: AboutData = {
  message1: "Учись, где и когда угодно", // TODO: fetch from Notion
  description:
    "Мы — современная онлайн-школа португальского языка с бразильским акцентом. Готовим к CELPE-BRAS, обещаем уровень B1 за шесть месяцев и помогаем с получением гражданства.", // TODO: fetch from Notion
  message2: "С нами учиться — приятно, а результат — гарантирован.", // TODO: fetch from Notion
  ctaText: "Ещё",
  ctaHref: "#", // TODO: TBD
};

const comparisonData: ComparisonData = {
  heading: "Почему TucanBRAS?",
  tucanPros: [], // TODO: fetch from Notion
  schoolCons: [], // TODO: fetch from Notion
  summaryText: "", // TODO: fetch from Notion
};

const tutorsData: TutorsData = {
  heading1: "Наши репетиторы — люди, которые любят язык и жизнь",
  heading2: "С ними ты не просто учишься — ты начинаешь думать на португальском.",
  description:
    "Мы не просто команда репетиторов — мы проводники в культуру, язык и бразильский образ жизни.",
  ctaText: "Выбрать репетитора",
  ctaHref: "#", // TODO: TBD
  tutors: [], // TODO: fetch from Notion
};

const celpeBrasData: CelpeBrasData = {
  heading: "", // TODO: fetch from Notion
  cards: [], // TODO: TBD — 5 cards, content not defined
  quote: "", // TODO: fetch from Notion
  descriptionLine: "", // TODO: fetch from Notion
  ctaText: "Связаться",
  ctaHref: "#", // TODO: TBD
};

const plansData: PlansData = {
  heading1:
    "Выбирай удобный формат: от одного пробного занятия до полной подготовки к CELPE-BRAS.",
  heading2: "Мы не прячем условия — всё честно, как под солнцем Бразилии",
  plans: [
    { name: "Одно занятие", price: "$17 / 1 урок", ctaText: "Попробовать" },
    { name: "Базовый пакет", price: "$199 / 10 уроков", ctaText: "Хочу этот пакет" },
    { name: "Продвинутый курс", price: "$449 / 30 уроков", ctaText: "Учусь всерьёз" },
    { name: "Учись без ограничений", price: "$749 / 1 месяц", ctaText: "Готовлюсь к экзамену" },
  ],
};

const footerData: FooterData = {
  faqGroups: [], // TODO: fetch from Notion (3 groups)
  policyLinks: [], // TODO: TBD — final URLs
  socialLinks: [], // TODO: TBD — final URLs
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      {/* 1 — fixed, вне main (не блюрится), z-50 */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-[43px] px-s600">
        <Header navLinks={NAV_LINKS} />
      </div>
      {/* Компенсация высоты fixed хедера: 43px (tucan) + 85px (bar mobile) / 96px (bar desktop) */}
      <main className="px-s600 pt-[128px] lg:pt-[139px]">
      {/* 2 */}
      <Hero data={heroData} />
      {/* 3 */}
      <About data={aboutData} />
      {/* 4 */}
      <Comparison data={comparisonData} />
      {/* 5 */}
      <Tutors data={tutorsData} />
      {/* 6 */}
      <CelpeBras data={celpeBrasData} />
      {/* 7 */}
      <Plans data={plansData} />
      {/* 8 */}
      <Footer data={footerData} />
    </main>
    </>
  );
}
