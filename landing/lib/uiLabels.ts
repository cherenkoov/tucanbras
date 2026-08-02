import type { Locale } from '@/types'

// UI strings the landing owns directly (NOT from Notion). Notion is being retired
// for these; the selection / continue flow needs stable localized copy in code.
export interface UiLabels {
  selected:     string
  unselected:   string
  planSelected: string  // CTA-надпись выбранного тарифа (тут восклицание, в отличие от `selected`)
  yourTutor:    string
  yourPlan:     string
  continue:     string
  join:         string
  comingSoon:   string
  tutorsNav:    string
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
  ru: { selected: 'Выбрано',     unselected: 'Отменено',   planSelected: 'Выбрано!',     yourTutor: 'Ваш тутор',  yourPlan: 'Ваш тариф', continue: 'Продолжить', join: 'Конект',  comingSoon: 'Пока не доступно',    tutorsNav: 'Туторы',  selectPlan: 'Выбрать тариф',   becomeTutor: 'Стать тутором',  wantToTeach: 'Хочу стать тутором',  forTutors: '(для туторов)',
        needBoth: 'Выберите тутора и тариф (0/2)',   needTutor: 'Выберите тутора (1/2)', needPlan: 'Выберите тариф (1/2)' },
  en: { selected: 'Selected',    unselected: 'Unselected', planSelected: 'Selected!',    yourTutor: 'Your tutor', yourPlan: 'Your plan', continue: 'Continue',   join: 'Connect', comingSoon: 'Not available yet',   tutorsNav: 'Tutors',  selectPlan: 'Choose a plan',   becomeTutor: 'Become a tutor', wantToTeach: 'I want to teach',     forTutors: '(for tutors)',
        needBoth: 'Choose a tutor and a plan (0/2)', needTutor: 'Choose a tutor (1/2)',  needPlan: 'Choose a plan (1/2)'  },
  pt: { selected: 'Selecionado', unselected: 'Cancelado',  planSelected: 'Selecionado!', yourTutor: 'Seu tutor',  yourPlan: 'Seu plano', continue: 'Continuar',  join: 'Konecta', comingSoon: 'Ainda não disponível', tutorsNav: 'Tutores', selectPlan: 'Escolher plano',  becomeTutor: 'Seja tutor',     wantToTeach: 'Quero ensinar',       forTutors: '(para tutores)',
        needBoth: 'Escolha um tutor e um plano (0/2)', needTutor: 'Escolha um tutor (1/2)', needPlan: 'Escolha um plano (1/2)' },
}

export function uiLabels(locale: string): UiLabels {
  return UI_LABELS[locale as Locale] ?? UI_LABELS.en
}
