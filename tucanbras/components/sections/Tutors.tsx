import Image from 'next/image'
import type { TutorsProps } from '@/types'
import type { Tutor } from '@/lib/tutors'

// ─── Tutor card ──────────────────────────────────────────────────────────────

function TutorCard({ tutor }: { tutor: Tutor }) {
  return (
    <div className="flex flex-col flex-1 min-w-[220px] lg:max-w-[400px]">

      {/* Photo — overflows above card */}
      <div className="relative w-full flex justify-center z-10 mb-[-24px]">
        <div
          className="overflow-hidden rounded-t-[28px] rounded-b-[60px] w-full"
          style={{ maxHeight: '260px' }}
        >
          {tutor.imageUrl ? (
            <img
              src={tutor.imageUrl}
              alt={tutor.fullName}
              className="w-full h-[260px] object-cover object-top pointer-events-none"
            />
          ) : (
            <div
              className="w-full h-[260px]"
              style={{ backgroundColor: '#a8d5ac' }}
            />
          )}
        </div>
      </div>

      {/* Card body */}
      <div
        className="flex flex-col gap-[20px] rounded-[36px] pt-[44px] pb-[32px] px-[24px] flex-1"
        style={{
          backgroundColor: '#7cb082',
          boxShadow: 'inset 0px 4px 4px 0px rgba(255,255,255,0.2), 0px 2px 4px 0px rgba(0,0,0,0.18)',
        }}
      >
        {/* Name */}
        <p
          className="font-accent font-bold text-cream text-center w-full"
          style={{ fontSize: 'clamp(18px, 1.8vw, 26px)', lineHeight: '1.2' }}
        >
          {tutor.fullName}
        </p>

        {/* Language flags */}
        {tutor.languages.length > 0 && (
          <div className="flex items-center justify-center gap-[8px]">
            {tutor.languages.map(lang => (
              <img
                key={lang.code}
                src={lang.flagPath}
                alt={lang.name}
                title={lang.name}
                className="w-[28px] h-[20px] object-cover rounded-[3px] pointer-events-none"
              />
            ))}
          </div>
        )}

        {/* Quote / description */}
        {tutor.quote && (
          <p
            className="font-accent font-bold text-cream text-center w-full"
            style={{ fontSize: 'clamp(15px, 1.5vw, 20px)', lineHeight: '1.35' }}
          >
            {tutor.quote}
          </p>
        )}

        {/* Specializations */}
        {tutor.specializations.length > 0 && (
          <div className="flex flex-col gap-[10px]">
            <p
              className="font-sans text-center"
              style={{ fontSize: '13px', color: 'rgba(255,252,229,0.65)' }}
            >
              Специализации
            </p>
            <div className="flex flex-wrap gap-[8px] justify-center">
              {tutor.specializations.map(tag => (
                <span
                  key={tag}
                  className="font-sans font-medium text-cream rounded-[40px] px-[16px] py-[8px]"
                  style={{ backgroundColor: '#3d3c3d', fontSize: '14px', lineHeight: '1' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Stub cards shown when DB is empty ───────────────────────────────────────

const STUB_TUTORS: Tutor[] = [
  {
    id: 1,
    fullName: 'Жоау Педро Алмейда',
    imageUrl: null,
    languages: [
      { code: 'pt-BR', name: 'Português',  flagPath: '/flags/pt-br.svg' },
      { code: 'ru',    name: 'Русский',    flagPath: '/flags/ru.svg'    },
    ],
    quote: 'Мои уроки спокойные и структурные. Помогаю навести порядок в голове и наконец понять, как работает грамматика.',
    specializations: ['Грамматика', 'Для A1'],
    interests: [],
  },
  {
    id: 2,
    fullName: 'Мария Фернанда Соуза да Силва',
    imageUrl: null,
    languages: [
      { code: 'pt-BR', name: 'Português', flagPath: '/flags/pt-br.svg' },
      { code: 'ru',    name: 'Русский',   flagPath: '/flags/ru.svg'    },
    ],
    quote: 'Объясняю просто и без занудства. Люблю примеры из реальной жизни в Бразилии и живую речь, а не учебниковый пластик.',
    specializations: ['Разговорная практика'],
    interests: [],
  },
  {
    id: 3,
    fullName: 'Ана Каролина Рибейру Кошта',
    imageUrl: null,
    languages: [
      { code: 'pt-BR', name: 'Português', flagPath: '/flags/pt-br.svg' },
      { code: 'en',    name: 'English',   flagPath: '/flags/en.svg'    },
    ],
    quote: 'Делаю упор на уверенную речь и правильное произношение. Исправляю мягко, но эффективно.',
    specializations: ['Постановка произношения', 'Разговорная практика'],
    interests: [],
  },
  {
    id: 4,
    fullName: 'Лукас Матеус Перейра да Роша',
    imageUrl: null,
    languages: [
      { code: 'pt-BR', name: 'Português', flagPath: '/flags/pt-br.svg' },
      { code: 'en',    name: 'English',   flagPath: '/flags/en.svg'    },
      { code: 'ru',    name: 'Русский',   flagPath: '/flags/ru.svg'    },
    ],
    quote: 'Готовлю к жизни, работе и реальным ситуациям. Минимум воды, максимум полезного языка.',
    specializations: ['Бразильский для работы', 'Деловая коммуникация'],
    interests: [],
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

interface TutorsSectionProps {
  data: TutorsProps['data']
  tutors: Tutor[]
}

export default function Tutors({ data, tutors }: TutorsSectionProps) {
  const displayTutors = tutors.length > 0 ? tutors : STUB_TUTORS

  return (
    <section id="tutors" className="w-full">
      <div className="flex flex-col gap-[64px] lg:gap-[80px] max-w-[1720px] mx-auto w-full">

        {/* ══ Headings row ══ */}
        <div className="flex flex-col lg:flex-row gap-[24px] lg:gap-[48px] items-start w-full">
          <h2
            className="font-heading font-bold text-ink flex-1"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
          >
            {data.heading1}
          </h2>
          <h2
            className="font-heading font-bold text-ink flex-1"
            style={{ fontSize: 'clamp(32px, 4vw, 64px)', lineHeight: '1.1' }}
          >
            {data.heading2}
          </h2>
        </div>

        {/* ══ Cards row ══ */}
        <div className="flex flex-col lg:flex-row gap-[24px] items-stretch w-full">
          {displayTutors.map(tutor => (
            <TutorCard key={tutor.id} tutor={tutor} />
          ))}
        </div>

        {/* ══ Description quote ══ */}
        <p
          className="font-heading font-bold text-ink text-center w-full uppercase"
          style={{ fontSize: 'clamp(13px, 1.2vw, 18px)', letterSpacing: '0.02em' }}
        >
          &ldquo;{data.description}&rdquo;
        </p>

        {/* ══ CTA button ══ */}
        <div className="flex justify-center w-full">
          <a
            href={data.ctaHref} // TODO: TBD
            className="flex items-center justify-center rounded-[66px] px-[48px]"
            style={{
              backgroundColor: '#2b2a2b',
              paddingTop: '44px',
              paddingBottom: '44px',
              boxShadow: 'var(--shadow-btn)',
              minWidth: '400px',
            }}
          >
            <span
              className="font-accent font-bold text-cream"
              style={{ fontSize: '32px', lineHeight: '32px' }}
            >
              {data.ctaText}
            </span>
          </a>
        </div>

      </div>
    </section>
  )
}
