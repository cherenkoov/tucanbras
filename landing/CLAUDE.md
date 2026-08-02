# TucanBRAS — Landing Page

## Что это за проект
Продающий лендинг онлайн-школы бразильского португальского языка **TucanBRAS**.
Цель страницы — привести пользователя к одной из конверсий:
записаться на бесплатный урок, выбрать репетитора, выбрать тариф, связаться по CELPE-BRAS.

---

## Стек

| Слой | Технология | Версия |
|------|-----------|--------|
| Framework | Next.js App Router | 16.2.10 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | 5.x strict |
| Styling | Tailwind CSS | v4 (PostCSS) |
| CMS | Notion API (`@notionhq/client`) | 5.17.0 |
| Database | PostgreSQL (`pg`) | 8.20.0 — общая БД `tukan` тукан-бота на VPS |
| Email | Resend | 6.12.0 |
| Deploy | VPS: `next start` за nginx, pm2 `tucanbras-landing` | см. корневой CLAUDE.md |

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
├── migrations/                 # SQL для БД (сейчас применяются к БД бота `tukan`)
└── docker-compose.yml          # PostgreSQL dev container
```

---

## Порядок секций — строго фиксирован

```
1. Header
2. Hero
3. About
4. Comparison
5. Tutors
6. CelpeBras
7. Plans
8. Footer (+ Form + FAQ)
```

Порядок **не менять** без явной команды.

> Волны (`WavesAnimated`) больше **не секция** — вынесены в `BackgroundCanvas` как фоновый
> слой позади пляжа (`main2`), `z-index: 9` (ниже `main2` z=10). Видны сквозь прозрачные
> участки пляжа. См. «Background Collage» ниже.

---

## Background Collage — фоновая система

`BackgroundCanvas` — фиксированный слой за всем контентом (z-index: 0), отображает визуальное путешествие по Бразилии при скролле.

| Сцена | Секции | Визуал |
|-------|--------|--------|
| 1 — Гора | Hero | Небо, гора Корковаду, статуя Христа |
| 2 — Лес | About, Comparison | Джунгли, кроны деревьев, лианы |
| 3 — Пляж | Tutors (heading) | Пляж (`main2`), волны (`WavesAnimated`, фон позади `main2`), пальмы |
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
- Волны (`WavesAnimated`) — фоновый слой в `BackgroundCanvas`, позади пляжа (декоративные, без CMS)

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

## Известные проблемы и бэклог (зафиксировано 2026-07-16)

Итог сессии оптимизации: краш вкладки на iPhone побеждён (две причины: per-leaf
Figma-фильтры папоротника + ~90 полностраничных спрайт-слоёв → ограниченные слои,
см. `components/ui/background/utils/spriteBoxes.ts`), телефон получает полный фон
со всеми анимациями. Рычаги: `?balanced=1` (без прибоя/волн), `?lite=1` (минимум),
`?noadaptive`/`?noanim`/`?nobg`/`?debug`/`?probe`/`?ablate` (ScrollDebug.tsx),
`?staticfill=1` (форсирует static-путь адаптивного текста на десктопе — A/B против
backdrop-эталона, см. useAdaptiveText.ts; парные скриншоты: `npm run verify:staticfill`).

Адаптивный текст (заголовки, реагирующие на фон дуотоном по яркости 0.70) —
ФИНАЛЬНАЯ архитектура (2026-07-19, провалидировано на реальном iPhone): текст СЭМПЛИРУЕТ
живой фон через `backdrop-filter`, как на десктопе — реконструкция композита больше не
основной путь.

**Палитра (2026-08-01): дуотон зелёный↔зелёный, ink и cream из системы убраны.**
`DUOTONES` в `AdaptiveText.tsx` — единый источник: тёмный фон → `--color-green` #8fd096,
светлый фон → `--color-green-dark` #6a906e (брендовый #8fd096 на светлом даёт всего
1.75:1 против cream, тёмно-зелёный — 3.53:1). Дефолт `DEFAULT_DUOTONE = 'green'` у
`AdaptiveText`, `AdaptiveIcon` и `AdaptiveDuotoneFilter`; точки карусели (`BACKDROP`)
тоже на нём. Палитра `ink` (ink↔cream) осталась как escape hatch — её никто не использует.
**Следствие для тача:** built-in-цепочка физически не умеет выдать цвет (все её фильтры
действуют одинаково на все каналы → результат всегда серый), поэтому НЕ-дефолтная палитра
уводит тач на static-fill (гейт `filterId === INK_FILTER_ID`). Сейчас это значит: весь
адаптивный ТЕКСТ на телефонах идёт по static-fill, а точки карусели остаются
почти-белыми/почти-чёрными. Проверено только в Chromium, на реальном iPhone — нет.
- **Десктоп** (движки, парсящие url(#) reference-filter): `backdrop-filter: url(#adaptive-duotone-green)`
  — точные цвета палитры, отражает движущиеся спрайты.
- **Тач/iOS** (WebKit рендерит url(#) в backdrop-filter как НИЧТО): встроенная цепочка
  `grayscale(1) brightness(0.714) contrast(50) invert(1)` (`BACKDROP_BUILTIN`) — та же
  попиксельная адаптация без SVG-фильтра (порог 0.70 попадает на пивот `contrast` через
  `brightness`, `invert` даёт тёмный фон→светлый / светлый→тёмный; цвета почти-белый/
  почти-чёрный — ТОЛЬКО для палитры `ink`, см. следствие выше).
  Оверлей растёт на 0.4em за бокс элемента (iOS клипует backdrop-filter по боксу и занижает
  выступ глифов в range-замерах — иначе срезает верхушки букв; позиционирование явными
  `top/left/right/bottom`, НЕ `inset`, иначе iOS перебивает).
- **Фолбэк на СТАРУЮ static-fill** (стек CSS background-слоёв под глифами: карточки
  `data-adaptive-cover` z100 → `collage-front-fill.svg` → арт пляжа → волны z9 → бурый грунт
  z8 → арт коллажа; fill-ассеты `main2-fill.svg`/`collage-front-fill.svg` ГЕНЕРИРУЮТСЯ
  `npm run gen:front-fill`, `?filldebug=1` — отладка стека): включается при reduced-motion,
  `?staticfill` (A/B), движках без backdrop-filter, и для ИКОНОК на тач (image-mask+backdrop
  на iOS не рендерится → ручной `staticFill`, применён: VS в Comparison). Имена значений
  `staticFill` исторические: `"ink"` = светлая сторона палитры (тёмно-зелёный),
  `"cream"` = тёмная (светло-зелёный) — красится `lightColor`/`darkColor` из `DUOTONES`.
- **ФИГУРЫ, а не глифы** (`useAdaptiveDuotone` + `dimDuotone`, применено: точки-индикатор
  карусели Tutors): у сплошной формы маской служит её собственный border-box (радиус
  клипает backdrop), поэтому ни SVG-маски глифов, ни image-mask не нужно — и путь живёт
  и на iOS (там ломается именно image-mask + backdrop). Приглушение соседних точек —
  `opacity()` ВНУТРИ цепочки backdrop-filter: element `opacity` регруппирует бокс и течёт
  за clip (см. фрост-слой в PlanSectionShared), а opacity на ПРЕДКЕ делает его backdrop
  root и сэмпл умирает совсем. reduced-motion тут НЕ выключает backdrop (он не добавляет
  движения, а плоский фолбэк оставлял бы точку невидимой на тёмной сцене). Фолбэк —
  плоский тёмно-зелёный. Guard: `npm run verify:tutor-dots` (+ `-- <url> 390x844 touch`
  для built-in-цепочки; ожидаемые цвета в скрипте зависят от режима — палитра на десктопе,
  чёрный/белый на тач).
- **Пустой текст ≠ баг рендера**: партиал-ответ Notion мог обнулить секцию (так CELPE-BRAS
  терял заголовок) → в `page.tsx` пофайловый фолбэк на snapshot по каждому primary-полю.

Осталось доделать:

1. **Параллакс на мобилке — ОСТАВЛЕН** (2026-07-19, owner-approved): фон едет на всех
   ширинах; дрейф гасится агрессивным кропом (`maxZoom 8`, дефолт; `?bgzoom=N` — тюнинг
   вживую), а адаптивный текст сэмплирует живой backdrop, поэтому дрейф больше не ломает
   заголовки. **Поезд** чинён (play/pause-сентинель привязан к полосе рельсов, не к
   %-контейнера — при 8× кропе промахивался). **Cabine + Люди** отключены на узком tier
   (<`WIDE_BREAKPOINT`) — вне кадра при 8× кропе, `useCarAnimation`/`useHumanAnimation`.
   Осталось глазами: джиттер фона в stack-секциях (CELPE-BRAS, Plans) при скролле; иногда
   stack стартует не с первого элемента.
2. **Фантомные прыжки по якорям при тапах** в местах без кнопок: тап по input в
   FooterForm может перекинуть к hero или CELPE-BRAS; тап между hero и about —
   к Plans. **Одну причину нашли и убрали 2026-07-30:** мобильный столбец пилюль
   под хедером при закрытом бургере был полностью прозрачным, но НАЖИМАЕМЫМ —
   контейнер `pointer-events-none`, а каждая пилюля возвращала себе
   `pointer-events-auto` (правило потомка бьёт родителя), плюс ни `inert`, ни
   выпадения из tab-order. ≈450px невидимых ссылок в правом верхнем углу, внутри
   fixed-хедера z-50, то есть поверх любого контента: тап «в никуда» уводил на
   `#footer` или в случайную секцию. Теперь пилюля сама гасит pointer-events по
   своей видимости, а на контейнере `inert` (он наследуется и накрывает ещё и
   свитчер языка). Гард: `npm run verify:header-drum` (Part 3) тапает в центр
   каждой скрытой пилюли и требует, чтобы страница не двигалась.
   **Пункт НЕ закрыт:** зарепорченный симптом — тап по input в FooterForm, это низ
   экрана, там призраков не было. Значит есть вторая причина (focus-scroll в форме
   или своя растянутая зона) — диагностировать отдельно.
3. **Пайплайн учителей: БД ↔ лендинг.** Учителя приходят через приложение →
   онбординг → анкета → одобрение админа → после этого появляются на лендинге.
   Продумать синхронизацию (кросс-репо: tucan-bot + landing).
   Решение 2026-07-17: **от Notion отказываемся** — админ-звено и CMS-контент
   лендинга (`lib/notion.ts`, лиды в `api/free-lesson`) предстоит мигрировать;
   замена пока не выбрана.
4. **Ловушка скролла в карусели Tutors (мобилка) — ИСПРАВЛЕНО 2026-07-24.**
   Корень: `touch-action: pan-x` стоял и на скроллере, и на КАРТОЧКЕ (в неё и
   попадает палец). `pan-x` разрешает начатому на элементе касанию только
   горизонтальный пан и НЕ чейнится к предку — вертикальный свайп не скроллил
   страницу вообще, юзер запирался в секции (двое тестеров решили, что это конец
   сайта). История: `pan-x` уже снимали в a9e0b44 по этой же причине, потом
   вернули в 80d2f39 — теперь ещё и на карточку. Фикс: карточка → `manipulation`
   (оба направления + pinch, без double-tap-zoom задержки), скроллер → без
   touch-action (нативный direction-lock: горизонталь в скроллер, вертикаль
   странице). Regression-guard: `npm run verify:carousel-scroll` (Playwright,
   raw touch-события через CDP; wheel и synthesizeScrollGesture тут не годятся).
5. **Stack-карточки Plans прижаты к header** — центрировать по y относительно
   viewport, как сделано в CELPE-BRAS stack.
6. **Редизайн FooterForm.**
7. **Зонтики растягиваются мобильным scaleY(1.2).** Фон на телефонах тянется по
   высоте (MOBILE_VSTRETCH), статуя контр-скейлится (`scaleY(1/vScale)` вокруг
   базы) — сделать то же для пальм/зонтиков (bounded-оверлеи в BackgroundCanvas:
   контр-скейл вокруг центра объекта, не ломая rotate спиннеров).
8. **Акцентный шрифт: добавить недостающие глифы** для португальского
   (ã, õ, ç, á, é, í, ó, ú, â, ê, ô…) — сейчас отображается некорректно.
9. **Легальные страницы:** Пользовательское соглашение, Политика
   конфиденциальности, Условия оплаты, Обработка персональных данных — ссылки
   в футере уже есть, страниц нет.

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
