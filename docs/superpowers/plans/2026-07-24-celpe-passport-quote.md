# CELPE-BRAS «паспорт + цитата» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в секцию CELPE-BRAS вводный блок «фото бразильского паспорта + цитата» сразу под заголовком, с адаптивной раскладкой (паспорт слева / цитата справа на ≥1024px; цитата сверху / паспорт снизу на узких).

**Architecture:** Один flex-контейнер `flex-col → lg:flex-row` с `order`-свопом объектов и единственной `<Image>` (без дублирования DOM). Цитата — `<AdaptiveText>` (дуотон ink↔cream по фону-коллажу), локализованная константа в компоненте (вне Notion). Паспорт — `next/image` в обёртке с `aspect-ratio`, размер задаётся `clamp` по ширине (мобайл) / высоте (десктоп), углы `rounded-[44px]` в тон карточкам.

**Tech Stack:** Next.js 16.2.10 (App Router, RSC), React 19, TypeScript strict, Tailwind CSS v4 (arbitrary + responsive классы), `next/image`, `sharp` (оптимизация ассета, уже в node_modules).

## Global Constraints

- Растровые изображения только через `next/image` — никаких `<img>` для растра.
- Токены/утилиты Tailwind из `globals.css`; сырые hex — только в декоративных `style` (тень) по образцу секции.
- Локализация ru / en / pt обязательна; статическая генерация — значение приходит по `locale`, **не из Notion**.
- Порядок секций и пунктов меню не менять.
- Радиус углов паспорта `rounded-[44px]` (в тон карточкам CELPE-BRAS).
- Точка переключения ряд↔стек — `lg` (1024px), как во всей секции.
- Тексты цитаты (verbatim):
  - ru: `Официальный экзамен, подтверждающий знание языка и открывающий путь к бразильскому гражданству.`
  - en: `The official exam that certifies your language proficiency and opens the path to Brazilian citizenship.`
  - pt: `O exame oficial que comprova o conhecimento do idioma e abre o caminho para a cidadania brasileira.`

## File Structure

- `landing/public/PNG/celpe/brazil-passport.png` — **создать**: оптимизированный ассет паспорта (источник `Assets/Brazil passport.png`, 550×776).
- `landing/types/index.ts` — **изменить**: `CelpeBrasProps` получает `locale: Locale`.
- `landing/components/sections/CelpeBras.tsx` — **изменить**: импорт `Image`/`Locale`, константы `PASSPORT_IMG` + `PASSPORT`, проп `locale`, рендер нового блока после заголовка.
- `landing/app/[locale]/page.tsx` — **изменить**: передать `locale={locale}` в `<CelpeBras>`.

---

## Task 1: Оптимизированный ассет паспорта

**Files:**
- Create: `landing/public/PNG/celpe/brazil-passport.png`
- Source: `Assets/Brazil passport.png` (550×776, ~700 КБ)

**Interfaces:**
- Consumes: ничего.
- Produces: файл по пути `/PNG/celpe/brazil-passport.png` (публичный URL), который Task 2 подключает как `PASSPORT_IMG`.

- [ ] **Step 1: Создать подпапку**

Run (из `landing/`):
```bash
mkdir -p public/PNG/celpe
```

- [ ] **Step 2: Оптимизировать PNG через sharp**

`sharp` уже в `landing/node_modules` (тянет Next для оптимизатора). НЕ использовать `convert` — на Windows это не ImageMagick. Сохраняем размер 550×776 (десктопный дисплей ~326px CSS → для 2× ретины нужно ~652px; исходные 550 близки к пределу, downscale НЕ делаем — только рекомпрессия).

Run (из `landing/`):
```bash
node -e "const s=require('sharp');s('../Assets/Brazil passport.png').png({compressionLevel:9,effort:10}).toFile('public/PNG/celpe/brazil-passport.png').then(i=>console.log('out',i.width+'x'+i.height,Math.round(i.size/1024)+'KB'))"
```
Expected: печатает `out 550x776 <N>KB`, где N заметно меньше 699 (полноцветная рекомпрессия без палитры — банды на градиенте исключены). Точный размер источника в репо не критичен: `next/image` дополнительно отдаёт webp/avif нужного размера в рантайме (`sizes` из Task 2).

- [ ] **Step 3: Проверить, что файл на месте и валиден**

Run (из `landing/`):
```bash
node -e "const b=require('fs').readFileSync('public/PNG/celpe/brazil-passport.png');console.log('exists',b.length>0,b.readUInt32BE(16)+'x'+b.readUInt32BE(20))"
```
Expected: `exists true 550x776`

- [ ] **Step 4: Commit**

```bash
git add public/PNG/celpe/brazil-passport.png
git commit -m "feat(celpe): оптимизированный ассет паспорта Бразилии"
```

---

## Task 2: Блок «паспорт + цитата» в CELPE-BRAS

**Files:**
- Modify: `landing/types/index.ts` (интерфейс `CelpeBrasProps`)
- Modify: `landing/components/sections/CelpeBras.tsx`
- Modify: `landing/app/[locale]/page.tsx:126`
- Verify: `landing/` — `npm run lint`, `npm run build`, Playwright-скриншоты (Step 8)

**Interfaces:**
- Consumes: `PASSPORT_IMG = '/PNG/celpe/brazil-passport.png'` (Task 1); `AdaptiveText` (`components/ui/AdaptiveText.tsx`, default export, проп `as`/`className`/`style`); `Locale` из `@/types`.
- Produces: изменённая сигнатура `CelpeBras({ data, locale }: CelpeBrasProps)` — `page.tsx` обязан передать `locale`.

- [ ] **Step 1: Добавить `locale` в `CelpeBrasProps`**

В `landing/types/index.ts` заменить блок:
```ts
export interface CelpeBrasProps {
  data: CelpeBrasData;
}
```
на:
```ts
export interface CelpeBrasProps {
  data: CelpeBrasData;
  locale: Locale;
}
```
(`Locale` уже экспортируется в этом файле, строка 4 — новый импорт не нужен.)

- [ ] **Step 2: Импорты + константы в `CelpeBras.tsx`**

В `landing/components/sections/CelpeBras.tsx` заменить шапку импортов:
```tsx
import type { CSSProperties } from 'react'
import { CelpeBrasProps } from '@/types'
import CelpeBrasStack from '@/components/sections/CelpeBrasStack'
import AdaptiveText from '@/components/ui/AdaptiveText'
```
на:
```tsx
import type { CSSProperties } from 'react'
import Image from 'next/image'
import { CelpeBrasProps } from '@/types'
import type { Locale } from '@/types'
import CelpeBrasStack from '@/components/sections/CelpeBrasStack'
import AdaptiveText from '@/components/ui/AdaptiveText'

// ─── Passport intro (asset + localized quote — NOT from Notion) ──────────────
const PASSPORT_IMG = '/PNG/celpe/brazil-passport.png'

const PASSPORT: Record<Locale, { quote: string; alt: string }> = {
  ru: {
    quote: 'Официальный экзамен, подтверждающий знание языка и открывающий путь к бразильскому гражданству.',
    alt: 'Обложка паспорта гражданина Бразилии',
  },
  en: {
    quote: 'The official exam that certifies your language proficiency and opens the path to Brazilian citizenship.',
    alt: 'Cover of a Brazilian passport',
  },
  pt: {
    quote: 'O exame oficial que comprova o conhecimento do idioma e abre o caminho para a cidadania brasileira.',
    alt: 'Capa do passaporte brasileiro',
  },
}
```

- [ ] **Step 3: Принять `locale` в сигнатуре**

В том же файле заменить:
```tsx
export default function CelpeBras({ data }: CelpeBrasProps) {
```
на:
```tsx
export default function CelpeBras({ data, locale }: CelpeBrasProps) {
```

- [ ] **Step 4: Вставить блок после заголовка**

В `CelpeBras.tsx` найти конец заголовка и начало сетки:
```tsx
        </AdaptiveText>

        {/* ══ Feature grid — mobile: stacking scroll, desktop: grid ══ */}
```
Вставить между ними новый блок:
```tsx
        </AdaptiveText>

        {/* ══ Passport + intro quote ══ */}
        {/* Один контейнер: mobile stack (цитата → паспорт) → lg row (паспорт слева / цитата справа).
            order-своп меняет визуальный порядок без дублирования DOM/картинки. items-center даёт
            вертикальный центр цитаты относительно высоты паспорта на десктопе. */}
        <div className="flex flex-col items-center gap-[40px] lg:flex-row lg:gap-[clamp(40px,5vw,96px)] w-full">

          {/* Паспорт: ширина-driven на мобайле, высота-driven на десктопе; углы в тон карточкам */}
          <div
            className="relative order-2 lg:order-1 shrink-0 overflow-hidden rounded-[44px] aspect-[550/776] w-[clamp(200px,62vw,300px)] lg:w-auto lg:h-[clamp(300px,24vw,460px)]"
            style={{ boxShadow: '0px 12px 32px rgba(0,0,0,0.22)' }}
          >
            <Image
              src={PASSPORT_IMG}
              alt={PASSPORT[locale].alt}
              fill
              sizes="(min-width: 1024px) 340px, 62vw"
              className="object-cover pointer-events-none"
            />
          </div>

          {/* Цитата: flex-1 справа на десктопе; text-center + mx-auto + max-width → центр по ширине div */}
          <div className="order-1 lg:order-2 lg:flex-1 w-full">
            <AdaptiveText
              as="p"
              className="font-accent font-bold text-center mx-auto leading-[1.35] px-[16px] lg:px-0 max-w-[22em] lg:max-w-[clamp(360px,40vw,760px)] text-[clamp(19px,4.5vw,30px)] lg:text-[clamp(24px,2.6vw,44px)]"
              style={{ letterSpacing: '0.02em' }}
            >
              &ldquo;{PASSPORT[locale].quote}&rdquo;
            </AdaptiveText>
          </div>

        </div>

        {/* ══ Feature grid — mobile: stacking scroll, desktop: grid ══ */}
```

- [ ] **Step 5: Передать `locale` в `page.tsx`**

В `landing/app/[locale]/page.tsx` заменить:
```tsx
          <CelpeBras data={celpeBrasData} />
```
на:
```tsx
          <CelpeBras data={celpeBrasData} locale={locale} />
```

- [ ] **Step 6: Lint**

Run (из `landing/`): `npm run lint`
Expected: без ошибок в `CelpeBras.tsx`, `page.tsx`, `types/index.ts`.

- [ ] **Step 7: Прод-сборка (тайпчек + минификатор)**

Run (из `landing/`): `npm run build`
Expected: `Compiled successfully`, тайп-ошибок нет. (Прод-сборка обязательна — на минификаторе Next 16 в истории проекта ловились дефекты строк; здесь тривиально, но правило секции — мерить на build.)

- [ ] **Step 8: Визуальная проверка на брейкпоинтах (Playwright)**

Запустить прод-сервер и снять скриншоты секции на ключевых ширинах.

Run (из `landing/`, терминал A): `npm run build && npm run start`
Затем (терминал B, из `landing/`) — скрипт во временный файл скратчпада:
```bash
node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const dir = process.env.TMP_SHOTS || '.';
  for (const w of [375, 768, 1024, 1440, 1920]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('http://localhost:3000/ru', { waitUntil: 'networkidle' });
    await p.locator('#celpe-bras').scrollIntoViewIfNeeded();
    await p.waitForTimeout(600);
    await p.locator('#celpe-bras').screenshot({ path: dir + '/celpe-' + w + '.png' });
    console.log('shot', w);
    await p.close();
  }
  await b.close();
})();
"
```
(`TMP_SHOTS` можно указать на скратчпад-директорию сессии.)

Глазами по скриншотам подтвердить:
- `375` / `768`: цитата сверху по центру, паспорт ниже по центру; паспорт не шире ~300px; текст не липнет к краям.
- `1024`: раскладка переключилась в ряд — паспорт слева, цитата справа, вертикально по центру относительно высоты паспорта.
- `1440` / `1920`: паспорт слева бо́льшего размера (высота растёт до ~460px кап), цитата по центру правого div, ширина строки ограничена (не растянута на всю ширину).
- Во всех: углы паспорта скруглены (44px), мягкая тень, цитата читаема (дуотон ink/cream), нет горизонтального скролла страницы.
- Проверить локали `/en` и `/pt` (в `goto` заменить `/ru`) — цитата на нужном языке.

- [ ] **Step 9: Commit**

```bash
git add landing/types/index.ts landing/components/sections/CelpeBras.tsx landing/app/[locale]/page.tsx
git commit -m "feat(celpe): блок паспорт + вводная цитата с адаптивной раскладкой"
```

---

## Self-Review

**Spec coverage:**
- Порядок Heading → паспорт+цитата → сетка+отзыв → hint+CTA — Task 2 Step 4 (вставка между заголовком и сеткой; сетка/отзыв не трогаются). ✓
- Ассет в `public/PNG/celpe/`, `next/image`, оптимизация — Task 1. ✓
- Широкие: паспорт слева `clamp(300–460px)`, цитата `flex-1`, V+H-центр — Task 2 Step 4 (`lg:flex-row items-center`, `lg:h-[clamp(300px,24vw,460px)]`, `lg:flex-1`, `text-center mx-auto max-w`). ✓
- Узкие: цитата сверху центрованная → паспорт снизу — `order`-своп + `flex-col items-center`. ✓
- Радиус 44px + тень — `rounded-[44px]` + `boxShadow`. ✓
- Адаптивный текст цитаты — `<AdaptiveText>`. ✓
- Локализация ru/en/pt вне Notion — константа `PASSPORT` + проп `locale`. ✓
- Таблица клэмпов (пол/кап по ширинам) — реализована теми же `clamp` из спеки. ✓

**Placeholder scan:** плейсхолдеров нет — все шаги с точным кодом/командами.

**Type consistency:** `CelpeBrasProps` расширен `locale: Locale` (Task 2 Step 1) → `page.tsx` передаёт `locale` (Step 5) → компонент деструктурирует `{ data, locale }` (Step 3) → `PASSPORT[locale]` (Step 4). `PASSPORT_IMG` определён (Step 2) и использован (Step 4). Согласовано.

**Примечание по AdaptiveText:** многострочная цитата на десктопе автоматически идёт по static-fill пути (backdrop-режим — только для однострочного текста); это ожидаемо и уже используется существующей многострочной цитатой-отзывом в этой же секции.
