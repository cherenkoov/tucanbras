import type { Locale } from '../types'

// Фиксированные списки из формы анкеты приложения
// (tucan/src/pages/Profile/TeacherProfile/Anketa/AnketaCard.jsx).
// Новый тег в приложении = новая строка здесь, иначе en/pt увидят русский текст.
const TAGS: Record<string, { en: string; pt: string }> = {
  // Специализации
  'Разговорная практика': { en: 'Conversation practice', pt: 'Prática de conversação' },
  'CELPE-BRAS': { en: 'CELPE-BRAS', pt: 'CELPE-BRAS' },
  'Носитель языка': { en: 'Native speaker', pt: 'Falante nativo' },
  // Интересы
  'Музыка': { en: 'Music', pt: 'Música' },
  'Бразильская кухня': { en: 'Brazilian cuisine', pt: 'Culinária brasileira' },
  'Кино': { en: 'Movies', pt: 'Cinema' },
  'Литература': { en: 'Literature', pt: 'Literatura' },
  'Путешествия': { en: 'Travel', pt: 'Viagens' },
  'Футбол': { en: 'Football', pt: 'Futebol' },
  'Баскетбол': { en: 'Basketball', pt: 'Basquete' },
  'Волейбол': { en: 'Volleyball', pt: 'Vôlei' },
  'История': { en: 'History', pt: 'História' },
}

export function translateTag(tag: string, locale: Locale): string {
  if (locale === 'ru') return tag
  return TAGS[tag]?.[locale] ?? tag
}

export function translateTags(tags: string[] | null, locale: Locale): string[] {
  return (tags ?? []).map(tag => translateTag(tag, locale))
}
