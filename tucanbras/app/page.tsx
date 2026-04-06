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

import { getTutors } from "@/lib/tutors";

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
  tucanPros: [
    "Зарегистрирован в Бразилии",
    "Готовим к экзаменам",
    "Бразильский диалект",
    "Записываем на CELPE-BRAS",
    "Гибкие тарифы",
    "Личный кабинет в Telegram-боте",
    "Крипто-френдли",
    "Гарантируем B1 через 6 месяцев",
  ], // TODO: fetch from Notion
  schoolCons: [
    "Другая юрисдикция",
    "Обычные курсы",
    "Европейский португальский",
    "Не записывают",
    "Невыгодные тарифы",
    "Старомодные сайты",
    "Устаревшие платежи",
    "Не заинтересованы в результате",
  ], // TODO: fetch from Notion
  summaryText: "Мы не конкурируем со школами — мы просто делаем то, что сами хотели бы пройти.", // TODO: fetch from Notion
};

const tutorsData: TutorsData = {
  heading1: "Наши репетиторы — люди, которые любят язык и жизнь",
  heading2: "С ними ты не просто учишься — ты начинаешь думать на португальском.",
  description:
    "Мы не просто команда репетиторов — мы проводники в культуру, язык и бразильский образ жизни.",
  ctaText: "Выбрать репетитора",
  ctaHref: "#", // TODO: TBD
};

const celpeBrasData: CelpeBrasData = {
  heading: "CELPE-BRAS — твой билет в новую жизнь",
  cards: [
    "Разбираем структуру экзамена",
    "Практикуем реальные задачи",
    "Тренируем устную часть",
    "Учебный план по CELPE-BRAS",
    "Помогаем записаться на экзамен",
  ], // TODO: fetch from Notion
  quote: "Мы прошли этот путь сами и теперь проводим по нему других. Без стресса, без бюрократии — с улыбкой и уверенностью.",
  hintText: "Или просто узнай, как проходит экзамен — мы расскажем лично",
  ctaText: "Связаться",
  ctaHref: "#", // TODO: TBD
};

const plansData: PlansData = {
  heading1: "Выбирай удобный формат: от одного пробного занятия до полной подготовки к CELPE-BRAS.",
  heading2: "Мы не прячем условия — всё честно, как под солнцем Бразилии",
  plans: [
    {
      name: "Одно занятие",
      priceAmount: "$17/",
      pricePeriod: "1 урок",
      subtitle: "Попробуй формат и познакомься с преподавателем",
      features: ["Подходит новичкам", "Доступ к Telegram-кабинету"],
      ctaText: "Попробовать",
      ctaHref: "#", // TODO: TBD
    },
    {
      name: "Базовый пакет",
      priceAmount: "$199/",
      pricePeriod: "10 уроков",
      subtitle: "Лучший вариант для системного старта",
      features: ["Индивидуальные занятия", "Гибкое расписание"],
      ctaText: "Хочу этот пакет",
      ctaHref: "#", // TODO: TBD
    },
    {
      name: "Продвинутый курс",
      priceAmount: "$449/",
      pricePeriod: "30 уроков",
      subtitle: "Идеален для достижения уровня В1",
      features: ["Индивидуальные занятия", "Гибкое расписание"],
      ctaText: "Учусь всерьёз",
      ctaHref: "#", // TODO: TBD
    },
    {
      name: "Учись без ограничений",
      priceAmount: "$749/",
      pricePeriod: "1 месяц",
      subtitle: "Сколько уроков — решаешь ты",
      features: ["Неограниченные занятия", "Телеграмм-статистика"],
      ctaText: "Готовлюсь к экзамену",
      ctaHref: "#", // TODO: TBD
    },
  ],
};

const footerData: FooterData = {
  faqGroups: [ // TODO: fetch from Notion
    {
      title: 'Learning',
      items: [
        { question: 'How are the classes going?', answer: '' },
        { question: 'Teachers', answer: '' },
        { question: 'Teaching methods', answer: '' },
        { question: 'Language level', answer: '' },
        { question: 'Schedule flexibility', answer: '' },
      ],
    },
    {
      title: 'For User',
      items: [
        { question: "Student's personal account", answer: '' },
        { question: 'Sign up for classes', answer: '' },
        { question: 'Homework assignments', answer: '' },
        { question: 'Progress tracking', answer: '' },
        { question: 'Payment options', answer: '' },
      ],
    },
    {
      title: 'For Tutor',
      items: [
        { question: 'Become a teacher', answer: '' },
        { question: "Teacher's profile", answer: '' },
        { question: 'Terms of cooperation', answer: '' },
      ],
    },
  ],
  policyLinks: [ // TODO: TBD — final URLs
    { label: 'User agreement', href: '#' },
    { label: 'Privacy policy', href: '#' },
    { label: 'Terms of payment', href: '#' },
    { label: 'Processing of personal data', href: '#' },
  ],
  socialLinks: [ // TODO: TBD — final URLs + export icons to /public/
    { label: 'Telegram',  href: '#', iconUrl: 'https://www.figma.com/api/mcp/asset/27b31bd7-f182-47d7-ae9e-9acade205d8a' },
    { label: 'Instagram', href: '#', iconUrl: 'https://www.figma.com/api/mcp/asset/7a2fa6f9-24eb-422b-85e2-2416fe702e8e' },
    { label: 'YouTube',   href: '#', iconUrl: 'https://www.figma.com/api/mcp/asset/912addad-310a-496c-ac10-3abd39e0397f' },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const tutors = await getTutors().catch(() => []);
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
      <Tutors data={tutorsData} tutors={tutors} />
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
