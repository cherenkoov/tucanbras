// Single source of truth for supported locales. proxy.ts (redirect), the
// free-lesson API (input validation) and app/[locale]/page.tsx (static params)
// must all agree — adding a locale means editing exactly this file.
export const LOCALES = ['ru', 'en', 'pt'] as const

export type LocaleCode = (typeof LOCALES)[number]

export function isLocale(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}
