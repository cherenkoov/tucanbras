# TucanBRAS — Landing Page

## Что это за проект
Продающий лендинг онлайн-школы бразильского португальского языка **TucanBRAS**.
Цель страницы — привести пользователя к одной из конверсий:
записаться на бесплатный урок, выбрать репетитора, выбрать тариф, связаться по CELPE-BRAS.

---

## Стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Framework | Next.js App Router | 16.2.2 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | 5.x strict |
| Styling | Tailwind CSS | v4 (PostCSS) |
| CMS | Notion API (`@notionhq/client`) | 5.17.0 |
| Database | PostgreSQL (`pg`) | 8.20.0 |
| Email | Resend | 6.12.0 |
| Deploy | Netlify | (plugin v5) |

Tailwind v4 не имеет `tailwind.config.ts` — все токены (цвета, тени, шрифты) объявлены в `app/globals.css`. Всегда использовать `var(--color-*)`, никогда не вводить сырые hex-значения.

---

## Структура проекта

```
tucanbras/
├── app/
│   ├── [locale]/page.tsx        # Собирает секции; генерирует статику для ru/en/pt
│   ├── api/free-lesson/route.ts # Lead capture: Notion + PostgreSQL + Telegram + email
│   ├── layout.tsx               # Root layout, metadata
│   └── globals.css              # Дизайн-токены, шрифты, CSS-анимации
├── components/
│   ├── sections/                # Полноэкранные секции
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── About.tsx
│   │   ├── Comparison.tsx
│   │   ├── Tutors.tsx
│   │   ├── WaveSection.tsx      # Декоративная секция (волны + пальмы)
│   │   ├── CelpeBras.tsx
│   │   ├── Plans.tsx
│   │   └── Footer.tsx
│   └── ui/                      # Переиспользуемые компоненты и анимации
│       ├── background/          # Фоновый коллаж (BackgroundCanvas + сцены)
│       │   ├── BackgroundCanvas.tsx
│       │   ├── useScrollScene.ts
│       │   ├── Scene1Mountain.tsx
│       │   ├── Scene2Forest.tsx
│       │   ├── Scene3Beach.tsx
│       │   ├── Scene4Cliff.tsx
│       │   └── SceneTransition.tsx
│       ├── FreeLessonModal.tsx
│       ├── FooterForm.tsx
│       ├── FernAnimated.tsx
│       ├── HibiscusUpAnimated.tsx
│       ├── HibiscusDownAnimated.tsx
│       ├── WavesAnimated.tsx    # 3 SVG-слоя волн
│       ├── PalmTopAnimated.tsx  # Корона пальмы вид сверху
│       └── ...
├── hooks/
│   └── useScrollAnimation.ts   # Общий RAF + scroll hook с idle detection
├── lib/
│   ├── notion.ts               # Данные всех секций из Notion
│   ├── tutors.ts               # PostgreSQL запрос репетиторов
│   ├── db.ts                   # PostgreSQL connection pool
│   └── email.ts                # Resend welcome emails (ru/en/pt)
├── types/
│   └── index.ts                # TypeScript-интерфейсы
├── public/
│   ├── fonts/                  # Involve (4 weights) + Rimma Sans
│   ├── PNG/                    # Фото, скриншоты дашборда, аватары
│   └── SVG/                    # Иконки, иллюстрации, флаги
├── docs/superpowers/
│   ├── plans/                  # Планы реализации
│   └── specs/                  # Дизайн-документы
├── docker-compose.yml          # PostgreSQL dev container
└── netlify.toml                # Deploy config
```

---

## Порядок секций — строго фиксирован

```
1. Header
2. Hero
3. About
4. Comparison
5. WaveSection      ← декоративная, без CMS-контента
6. Tutors
7. CelpeBras
8. Plans
9. Footer (+ Form + FAQ)
```

Порядок **не менять** без явной команды.

---

## Background Collage — фоновая система

`BackgroundCanvas` — фиксированный слой за всем контентом (z-index: 0), отображает визуальное путешествие по Бразилии при скролле.

| Сцена | Секции | Визуал |
|-------|--------|--------|
| 1 — Гора | Hero | Небо, гора Корковаду, статуя Христа |
| 2 — Лес | About, Comparison | Джунгли, кроны деревьев, лианы |
| 3 — Пляж | WaveSection, Tutors (heading) | Океан, волны, пальмы |
| 4 — Обрыв | Tutors (cards) | Скала, океан далеко внизу |

Статуя Христа: реализация пока открыта — SVG (стилизованная 2D) или Three.js (интерактивная 3D). Обе опции валидны.

Правила:
- Один scroll listener — в `BackgroundCanvas`
- `prefers-reduced-motion`: показывать статичный первый кадр
- Мобильные: только opacity-переход между сценами, parallax отключён

---

## Анимации — правила

- Все scroll-driven анимации используют `hooks/useScrollAnimation.ts`
- Анимации обновляют DOM напрямую через ref — никогда не через React state
- `prefers-reduced-motion` проверяется в каждом анимационном компоненте
- Idle detection: останавливать RAF после 60 кадров с |target| < 0.001

---

## Notion как CMS — правила работы

Весь контент берётся из Notion через `lib/notion.ts`. Тексты секций **не хардкодятся** в компонентах.

**Что идёт из Notion:**
- Тексты заголовков и описаний всех секций
- Карточки репетиторов (имя, языки, описание, теги)
- Тарифы (название, цена, описание, CTA-текст, буллеты)
- FAQ (вопросы и ответы)
- CELPE-BRAS карточки

**Что хардкодится в коде:**
- Структура навигации и якорные ссылки
- Порядок секций
- Анимации, hover-эффекты, декоративная логика
- Логика отправки формы
- `WaveSection` — полностью хардкод (декоративная, без CMS)

---

## Формы и захват лидов

Два входа: `FreeLessonModal` (popup) и `FooterForm` (встроенная форма).
Оба POST на `/api/free-lesson`.
Пайплайн: Notion → PostgreSQL → Telegram-уведомление → Resend welcome email.

---

## Дизайн

Все компоненты строятся строго по Figma. Не придумывать цвета, отступы, размеры шрифтов — только токены из `globals.css` и значения из макета.

> Ссылку на Figma добавить сюда после настройки доступа.

---

## Важные ограничения

- Порядок секций фиксирован — не менять
- Названия пунктов меню фиксированы — не менять
- CTA-тексты берутся из Notion — не хардкодить
- Мобильная версия обязательна для всех секций
- Локализация: ru / en / pt — статическая генерация через `generateStaticParams`
- `<Image>` из `next/image` везде — никаких `<img>` для растровых изображений

---

## Фазы разработки

**Фаза 0 — Техдолг** (завершить optimization plan 2026-04-24)
Финализировать `useScrollAnimation`, рефакторинг FernAnimated + Hibiscus, `prefers-reduced-motion` везде.

**Фаза 1 — Background Collage**
Реализовать `BackgroundCanvas` и сцены 1–4.

**Фаза 2 — WaveSection**
Новая декоративная секция: `WavesAnimated` (3 SVG-слоя) + `PalmTopAnimated` (кроны сверху).

**Фаза 3 — Дополнительные декоративные элементы**
`TropicalFlower`, `VineAnimated`, `LeafDrop` по секциям.

**Фаза 4 — Аналитика** (отложена)
GA4 / Vercel Analytics, конверсионные события, UTM → Notion.

Полный дизайн: `docs/superpowers/specs/2026-05-01-development-plan-design.md`

---

## Open Questions

- Статуя Христа: SVG или Three.js? Решить когда дизайн-ассеты готовы.
- Финальные URL соцсетей (TG, IG, YouTube)
- Финальные URL политики конфиденциальности
- `NEXT_PUBLIC_TG_BOT_URL` — финальный URL Telegram-бота
- Figma ссылка — добавить после настройки доступа

---

## Notion-страницы проекта (для справки)

- Navigation (главная): `30fae1f4-e768-47ba-a14f-f363b1ef2581`
- Overview: `d01e9b3b-0172-492a-a227-f77652bb434a`
- Release Scope: `954d579c-7c28-4de9-9e5e-477ddb6e4c4b`
- Open Questions: `0dabadfe-26cd-4b99-86aa-ac660fba6d72`
- Section / Header: `22a1c4aa-c5d6-4cc2-aed3-af023852ebc3`
- Section / Hero: `ba1c2d13-4e3c-4029-8961-f631b3e18663`
- Section / Tutors: `70cb7741-197c-4b5f-90f9-e2dc6d8ba692`
- Section / Plans: `85036a8e-ec7f-4cb8-9848-aaff5b13af28`
- Section / Comparison: `20d48f61-1219-4944-8a91-353101b9db77`
- Section / Footer: `9193d873-16fa-46f0-83a8-4e19787bb5cf`
