import type { Locale } from '@/types'

// UI strings the landing owns directly. These are chrome — button states, form
// affordances — not editable marketing copy, so they stay in code even after the
// CMS migration. Section texts live in Postgres (LandingContents) and are edited
// in the tucan admin panel.
export interface UiLabels {
  selected:     string
  unselected:   string
  planSelected: string  // CTA-надпись выбранного тарифа (тут восклицание, в отличие от `selected`)
  /**
   * Надпись на hero-CTA. Живёт здесь, а не в CMS (где всё ещё лежит `hero.ctaText`
   * «Бесплатный урок»): кнопка теперь выбирает пробный урок как тариф, и её текст —
   * часть той же тройки состояний, что `planSelected` и `unselected`. Строкой владеет
   * код, а не CMS.
   */
  tryFree:      string
  yourTutor:    string
  yourPlan:     string
  continue:     string
  join:         string
  comingSoon:   string
  selectPlan:   string
  becomeTutor:  string  // хедер: пилюля под барабаном, ведёт в футер-форму
  wantToTeach:  string  // футер-форма: псевдо-тутор «учительская» ветка онбординга
  forTutors:    string  // приглушённая приписка рядом с wantToTeach — кому этот пункт
  // Подсказка у курсора на неактивной кнопке «Продолжить»: чего именно не хватает.
  // Счётчик в скобках — сколько из двух полей формы уже заполнено.
  needBoth:     string
  needTutor:    string
  needPlan:     string
}

/**
 * The "I want to teach" entry in the footer's tutor dropdown is not a tutor — it is
 * the teacher branch of onboarding wearing a tutor's clothes, so the header pill can
 * preselect it through the same `tutor-selected` event the carousel already speaks.
 * Negative because real ids are Postgres serials: nothing can ever collide with it.
 */
export const BECOME_TEACHER_ID = -1

const UI_LABELS: Record<Locale, UiLabels> = {
  ru: { selected: 'Выбрано',     unselected: 'Отменено',   planSelected: 'Выбрано!',     yourTutor: 'Ваш тутор',  yourPlan: 'Ваш тариф', continue: 'Продолжить', join: 'Конект',  comingSoon: 'Пока не доступно',  selectPlan: 'Выбрать тариф',   becomeTutor: 'Стать тутором',  wantToTeach: 'Хочу стать тутором',  forTutors: '(для туторов)',
        tryFree: 'Попробуй бесплатно',
        needBoth: 'Выберите тутора и тариф (0/2)',   needTutor: 'Выберите тутора (1/2)', needPlan: 'Выберите тариф (1/2)' },
  en: { selected: 'Selected',    unselected: 'Unselected', planSelected: 'Selected!',    yourTutor: 'Your tutor', yourPlan: 'Your plan', continue: 'Continue',   join: 'Connect', comingSoon: 'Not available yet',  selectPlan: 'Choose a plan',   becomeTutor: 'Become a tutor', wantToTeach: 'I want to teach',     forTutors: '(for tutors)',
        tryFree: 'Try free',
        needBoth: 'Choose a tutor and a plan (0/2)', needTutor: 'Choose a tutor (1/2)',  needPlan: 'Choose a plan (1/2)'  },
  pt: { selected: 'Selecionado', unselected: 'Cancelado',  planSelected: 'Selecionado!', yourTutor: 'Seu tutor',  yourPlan: 'Seu plano', continue: 'Continuar',  join: 'Konecta', comingSoon: 'Ainda não disponível', selectPlan: 'Escolher plano',  becomeTutor: 'Seja tutor',     wantToTeach: 'Quero ensinar',       forTutors: '(para tutores)',
        tryFree: 'Experimente grátis',
        needBoth: 'Escolha um tutor e um plano (0/2)', needTutor: 'Escolha um tutor (1/2)', needPlan: 'Escolha um plano (1/2)' },
}

export function uiLabels(locale: string): UiLabels {
  return UI_LABELS[locale as Locale] ?? UI_LABELS.en
}
