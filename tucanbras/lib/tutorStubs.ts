import type { Locale } from '@/types'
import type { Tutor } from './tutors'

// ─── Stub data (fallback when DB has no tutors) ───────────────────────────────

const STUB_DATA: Record<Locale, { fullName: string; quote: string; specializations: string[] }[]> = {
  ru: [
    { fullName: 'Жоау Педро Алмейда',           quote: 'Мои уроки спокойные и структурные. Помогаю навести порядок в голове и наконец понять, как работает грамматика.', specializations: ['Грамматика', 'Для A1'] },
    { fullName: 'Мария Фернанда Соуза да Силва', quote: 'Объясняю просто и без занудства. Люблю примеры из реальной жизни в Бразилии и живую речь, а не учебниковый пластик.', specializations: ['Разговорная практика'] },
    { fullName: 'Ана Каролина Рибейру Кошта',    quote: 'Делаю упор на уверенную речь и правильное произношение. Исправляю мягко, но эффективно.', specializations: ['Постановка произношения', 'Разговорная практика'] },
    { fullName: 'Лукас Матеус Перейра да Роша',  quote: 'Готовлю к жизни, работе и реальным ситуациям. Минимум воды, максимум полезного языка.', specializations: ['Бразильский для работы', 'Деловая коммуникация'] },
    { fullName: 'Рената Лима Фигейреду',         quote: 'Помогаю подготовиться к экзаменам без паники. Чётко объясняю формат, требования и типичные ошибки.', specializations: ['Письменная речь', 'Подготовка к CELPE-BRAS'] },
  ],
  en: [
    { fullName: 'João Pedro Almeida',            quote: 'My lessons are calm and structured. I help you clear up confusion and finally understand how the grammar works.', specializations: ['Grammar', 'For A1'] },
    { fullName: 'Maria Fernanda Souza da Silva',  quote: 'I explain simply and without boring theory. I love real-life examples from Brazil and natural speech over textbook language.', specializations: ['Conversational Practice'] },
    { fullName: 'Ana Carolina Ribeiro Costa',     quote: 'I focus on confident speech and correct pronunciation. I correct you gently but effectively.', specializations: ['Pronunciation', 'Conversational Practice'] },
    { fullName: 'Lucas Mateus Pereira da Rocha',  quote: 'I prepare you for real life, work, and everyday situations. Minimum filler, maximum useful language.', specializations: ['Brazilian for Work', 'Business Communication'] },
    { fullName: 'Renata Lima Figueiredo',         quote: 'I help you prepare for exams without the panic. I clearly explain the format, requirements, and common mistakes.', specializations: ['Written Skills', 'CELPE-BRAS Prep'] },
  ],
  pt: [
    { fullName: 'João Pedro Almeida',            quote: 'Minhas aulas são calmas e estruturadas. Ajudo você a organizar as ideias e finalmente entender como a gramática funciona.', specializations: ['Gramática', 'Para A1'] },
    { fullName: 'Maria Fernanda Souza da Silva',  quote: 'Explico de forma simples e sem enrolação. Gosto de exemplos da vida real no Brasil e da fala natural, não do plástico dos livros didáticos.', specializations: ['Prática Conversacional'] },
    { fullName: 'Ana Carolina Ribeiro Costa',     quote: 'Foco na fala segura e na pronúncia correta. Corrijo com suavidade, mas com eficácia.', specializations: ['Pronúncia', 'Prática Conversacional'] },
    { fullName: 'Lucas Mateus Pereira da Rocha',  quote: 'Preparo para a vida, o trabalho e situações reais. Mínimo de enrolação, máximo de linguagem útil.', specializations: ['Português para o Trabalho', 'Comunicação Empresarial'] },
    { fullName: 'Renata Lima Figueiredo',         quote: 'Ajudo a se preparar para os exames sem pânico. Explico claramente o formato, os requisitos e os erros comuns.', specializations: ['Escrita', 'Preparação para o CELPE-BRAS'] },
  ],
}

const STUB_BASE: Omit<Tutor, 'fullName' | 'quote' | 'specializations'>[] = [
  { id: 1, imageUrl: '/PNG/avatars/joau.png',   languages: [{ code: 'pt-BR', name: 'Português', flagPath: '/PNG/flags/brazil.png' }, { code: 'ru', name: 'Русский', flagPath: '/PNG/flags/russia.png' }], interests: [] },
  { id: 2, imageUrl: '/PNG/avatars/maria.png',  languages: [{ code: 'pt-BR', name: 'Português', flagPath: '/PNG/flags/brazil.png' }, { code: 'ru', name: 'Русский', flagPath: '/PNG/flags/russia.png' }], interests: [] },
  { id: 3, imageUrl: '/PNG/avatars/ana.png',    languages: [{ code: 'pt-BR', name: 'Português', flagPath: '/PNG/flags/brazil.png' }, { code: 'en', name: 'English', flagPath: '/PNG/flags/usa.png'    }], interests: [] },
  { id: 4, imageUrl: '/PNG/avatars/lucas.png',  languages: [{ code: 'pt-BR', name: 'Português', flagPath: '/PNG/flags/brazil.png' }, { code: 'en', name: 'English', flagPath: '/PNG/flags/usa.png'    }, { code: 'ru', name: 'Русский', flagPath: '/PNG/flags/russia.png' }], interests: [] },
  { id: 5, imageUrl: '/PNG/avatars/renate.png', languages: [{ code: 'pt-BR', name: 'Português', flagPath: '/PNG/flags/brazil.png' }, { code: 'en', name: 'English', flagPath: '/PNG/flags/usa.png'    }, { code: 'ru', name: 'Русский', flagPath: '/PNG/flags/russia.png' }], interests: [] },
]

export function getStubTutors(locale: Locale): Tutor[] {
  return STUB_BASE.map((base, i) => ({ ...base, ...STUB_DATA[locale][i] }))
}
