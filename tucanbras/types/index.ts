// TypeScript interfaces for all 8 sections of TucanBRAS landing page.
// Content comes from Notion (see lib/notion.ts). Only structure & nav are hardcoded.

export type Locale = 'ru' | 'en' | 'pt'

// ─── 1. Header ───────────────────────────────────────────────────────────────
export interface NavLink {
  label: string;
  href: string; // anchor link, e.g. "#tutors"
}

export interface HeaderData {
  nav0: string; // "О тукане"
  nav1: string; // "Репетиторы"
  nav2: string; // "CELPE-BRAS"
  nav3: string; // "Тарифы"
}

export interface HeaderProps {
  navLinks: NavLink[];
}

// ─── 2. Hero ─────────────────────────────────────────────────────────────────
export interface HeroData {
  heading1: string;
  heading2: string;
  ctaText: string;
  ctaHref: string; // TODO: TBD
}

export interface HeroProps {
  data: HeroData;
}

// ─── 3. About ────────────────────────────────────────────────────────────────
export interface AboutData {
  message1: string;    // "Учись, где и когда угодно" — heading in Block 1
  description: string; // paragraph text in Block 2
  message2: string;    // "С нами учиться — приятно…" — quote in Block 3
  ctaText: string;     // button label, e.g. "More"
  ctaHref: string;     // TODO: TBD
}

export interface AboutProps {
  data: AboutData;
}

// ─── 4. Comparison ───────────────────────────────────────────────────────────
export interface ComparisonData {
  heading: string;
  tucanTitle: string;
  schoolTitle: string;
  tucanPros: string[];
  schoolCons: string[];
  summaryText: string;
}

export interface ComparisonProps {
  data: ComparisonData;
}

// ─── 5. Tutors ───────────────────────────────────────────────────────────────
// TutorCard comes from PostgreSQL via lib/tutors.ts — re-export Tutor type there.
// TutorsData holds static text (headings, CTA) + the DB-fetched tutor list.
export interface TutorsData {
  heading1: string;
  heading2: string;
  description: string;
  ctaText: string;
  ctaHref: string; // TODO: TBD
}

export interface TutorsProps {
  data: TutorsData;
}

// ─── 6. CelpeBras ────────────────────────────────────────────────────────────
// Cards have only a title; icon and color are hardcoded per design.
export interface CelpeBrasData {
  heading: string;
  cards: string[]; // 5 card titles
  quote: string;
  hintText: string;  // "Или просто узнай, как проходит экзамен — мы расскажем лично"
  ctaText: string;
  ctaHref: string; // TODO: TBD
}

export interface CelpeBrasProps {
  data: CelpeBrasData;
}

// ─── 7. Plans ────────────────────────────────────────────────────────────────
export interface PlanCard {
  name: string;         // "Одно занятие"
  priceAmount: string;  // "$17/"
  pricePeriod: string;  // "1 урок"
  subtitle: string;     // short description below price
  features: string[];   // 2 feature bullets with checkmarks
  ctaText: string;
  ctaHref: string;      // TODO: TBD
}

export interface PlansData {
  heading1: string;
  heading2: string;
  plans: PlanCard[];
}

export interface PlansProps {
  data: PlansData;
}

// ─── 8. Footer ───────────────────────────────────────────────────────────────
export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqGroup {
  title: string;
  items: FaqItem[];
}

export interface FooterData {
  formTitle: string;
  formNamePlaceholder: string;
  formTelegramPlaceholder: string;
  formSubmitText: string;
  brandDescription: string;
  legalTitle: string;
  copyright: string;
  allRightsReserved: string;
  faqGroups: FaqGroup[];  // 3 groups — from Notion
  policyLinks: { label: string; href: string }[];
  socialLinks: { label: string; href: string; iconUrl: string }[];
}

export interface FooterProps {
  data: FooterData;
}
