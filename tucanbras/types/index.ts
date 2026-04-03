// TypeScript interfaces for all 8 sections of TucanBRAS landing page.
// Content comes from Notion (see lib/notion.ts). Only structure & nav are hardcoded.

// ─── 1. Header ───────────────────────────────────────────────────────────────
// Navigation structure is hardcoded per CLAUDE.md — no Notion data needed.
export interface NavLink {
  label: string;
  href: string; // anchor link, e.g. "#tutors"
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
  block1: string;
  block2: string;
  ctaText: string;
}

export interface AboutProps {
  data: AboutData;
}

// ─── 4. Comparison ───────────────────────────────────────────────────────────
export interface ComparisonData {
  heading: string;
  tucanPros: string[];
  schoolCons: string[];
  summaryText: string;
}

export interface ComparisonProps {
  data: ComparisonData;
}

// ─── 5. Tutors ───────────────────────────────────────────────────────────────
export interface TutorCard {
  name: string;
  languages: string[];
  description: string;
  specialtyTags: string[];
  interestTags?: string[]; // optional per CLAUDE.md
}

export interface TutorsData {
  heading1: string;
  heading2: string;
  description: string;
  ctaText: string;
  ctaHref: string; // TODO: TBD
  tutors: TutorCard[];
}

export interface TutorsProps {
  data: TutorsData;
}

// ─── 6. CelpeBras ────────────────────────────────────────────────────────────
export interface CelpeBrasFeatureCard {
  title: string;
  description: string; // TODO: TBD — content of 5 cards not defined yet
}

export interface CelpeBrasData {
  heading: string;
  cards: CelpeBrasFeatureCard[]; // 5 cards
  quote: string;
  descriptionLine: string;
  ctaText: string;
  ctaHref: string; // TODO: TBD
}

export interface CelpeBrasProps {
  data: CelpeBrasData;
}

// ─── 7. Plans ────────────────────────────────────────────────────────────────
export interface PlanCard {
  name: string;
  price: string;
  ctaText: string;
  description?: string;
  bullets?: string[];
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
  faqGroups: FaqGroup[]; // 3 groups
  policyLinks: { label: string; href: string }[];
  socialLinks: { label: string; href: string }[]; // TODO: TBD — final URLs
}

export interface FooterProps {
  data: FooterData;
}
