# Фаза 2 — CMS лендинга в админке tucan: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести тексты всех секций лендинга из Notion в Postgres `tukan`, дать админу редактировать их в приложении tucan, и научить лендинг читать контент из БД с фолбэком на запечённый снапшот.

**Architecture:** Бот владеет таблицей `LandingContents (section, locale, data JSONB)` с уникальным индексом `(section, locale)` и отдаёт её через `GET /api/landing-content?locale=` / `PUT /api/landing-content/:section/:locale` под ролями ADMIN/OWNER. `data` хранит объект РОВНО в форме TypeScript-типов лендинга (`landing/types/index.ts`) — лендинг потребляет без маппинга. Админка рисует формы по декларативной схеме секций (никакого сырого JSON-редактора). Лендинг заменяет `lib/notion.ts` на `lib/content.ts` с теми же сигнатурами геттеров; после сохранения бот дёргает `POST /api/revalidate` лендинга, чтобы правка появлялась сразу, а не через час ISR.

**Tech Stack:** Sequelize 6 + Express (CommonJS, Node 22) в боте; React 19 + CRA + axios в админке; Next 16.2.10 App Router + TypeScript strict + `pg` в лендинге.

## Global Constraints

- **Секции — ровно 8 ключей:** `header, hero, about, comparison, tutors, celpeBras, plans, footer`. FAQ живёт внутри `footer.faqGroups`, отдельной секцией НЕ является.
- **Локали — ровно 3:** `ru, en, pt`.
- **Итого 24 строки** в `LandingContents` после сидинга (8 × 3).
- **Роли для записи:** только `ADMIN` и `OWNER`, через `checkRole(['ADMIN','OWNER'])` из `middleware/checkRoleMiddleware`.
- **Бот на старте делает `sequelize.sync({ alter: { drop: false } })`** (`server.js:170`) — любая колонка, которую читает лендинг, ОБЯЗАНА быть объявлена в модели бота, иначе sync её снесёт.
- **`data` — форма типов лендинга без маппинга.** Источник истины по форме: `landing/types/index.ts` (`HeaderData`, `HeroData`, `AboutData`, `ComparisonData`, `TutorsData`, `CelpeBrasData`, `PlansData`, `FooterData`) — ровно восемь интерфейсов `*Data`, по одному на секцию.
- **Тесты бота:** `node:test` + `node:assert/strict`, запуск `npm test` (= `node --test`). На Node 22/Windows `node --test <директория>` падает — использовать безаргументную форму.
- **Тесты лендинга:** `node:test` через tsx, запуск `npx tsx --test <файл>`.
- **Тесты админки:** jest + @testing-library через `npm test` (react-scripts), файлы `*.test.jsx`.
- **Чистая логика выносится в отдельный модуль** и тестируется без БД — паттерн `services/anketaStatus.js` из Фазы 1.
- **Деплой админки:** `git checkout -- package-lock.json` ПЕРЕД `git pull`, затем `npm install` (НЕ `npm ci` — лок протух), затем `npm run build`. pm2 не трогать.
- **`FreeLessonModal` удаляется совсем** (решение владельца 2026-07-28): компонент нигде не монтируется с момента редизайна. В CMS секции `modal` нет, в снапшоте её тоже не остаётся, тип `FreeLessonModalStrings` и сам компонент (403 строки) удаляются в Task 9. **Следствие для Фазы 3:** пункт «Хочу стать преподавателем» добавляется ТОЛЬКО в `FooterForm` — спека Фазы 3 говорит про «обе формы», это больше не так.

---

## Структура файлов

**tucan-bot** (`c:\active-projects\tucan-bot`, ветка от `origin/main`):
- Создать `models/landingContent.js` — модель `LandingContent`, одна ответственность: схема таблицы.
- Изменить `models/index.js` — регистрация модели в `db`.
- Создать `services/landingSections.js` — чистые вайтлисты и валидаторы, без БД и без Express.
- Создать `controllers/landingContentController.js` — класс-контроллер, читает/пишет через модель.
- Создать `routes/landingContentRouter.js` — маршруты + guard'ы ролей.
- Изменить `routes/index.js` — монтирование `/landing-content`.
- Создать `utils/revalidateLanding.js` — исходящий хук на лендинг, никогда не бросает.
- Создать `scripts/seedLandingContent.js` — одноразовый сидинг из снапшота.
- Создать `services/landingSeed.js` — чистая трансформация «снапшот → массив строк», тестируемая без БД.
- Создать тесты `test/landing-sections.test.js`, `test/landing-model.test.js`, `test/landing-seed.test.js`, `test/landing-revalidate.test.js`.

**tucan** (`c:\active-projects\tucan`, ветка от `origin/main`):
- Создать `src/pages/Profile/AdminOwnerProfile/landingSchema.js` — декларативная схема полей всех секций.
- Создать `src/pages/Profile/AdminOwnerProfile/LandingContentPage.jsx` — страница CMS.
- Создать `src/pages/Profile/AdminOwnerProfile/LandingContentPage.test.jsx`.
- Создать `src/pages/Profile/css/LandingContentPage.css`.
- Изменить `src/utils/consts.js` — `LANDING_CMS_ROUTE`.
- Изменить `src/components/AppRouter.jsx` — регистрация маршрута.
- Изменить `src/pages/Profile/AdminOwnerProfile/AdminOwnerProfile.jsx` — карточка «Контент лендинга».

**landing** (`c:\active-projects\TucanBRAS\landing`, ветка от `dev` ПОСЛЕ коммита редизайна):
- Создать `lib/contentResolve.ts` — чистая логика фолбэка, тестируемая без БД.
- Создать `lib/contentResolve.test.ts`.
- Создать `lib/content.ts` — геттеры секций из Postgres (замена `lib/notion.ts`).
- Переименовать `lib/notionSnapshot.json` → `lib/contentSnapshot.json` (через `git mv`).
- Создать `app/api/revalidate/route.ts`.
- Изменить `app/[locale]/page.tsx`, `lib/uiLabels.ts`, `app/api/free-lesson/route.ts`, `package.json`.
- Удалить `lib/notion.ts`, `components/ui/NotionRetry.tsx`, `scripts/snapshot-notion.ts`.

---

# Часть A — tucan-bot

Работать в `c:\active-projects\tucan-bot`. **Локальный чекаут протух** (ветка `fix/anketa-upload-corruption` на 19 коммитов позади `origin/main` и без своих наработок) — начать с ветки от `origin/main`.

### Task 1: Модель LandingContent + вайтлист секций

**Files:**
- Create: `models/landingContent.js`
- Create: `services/landingSections.js`
- Modify: `models/index.js`
- Test: `test/landing-model.test.js`, `test/landing-sections.test.js`

**Interfaces:**
- Produces: `{ LandingContent }` из `models/landingContent.js`; `db.LandingContent` из `models/index.js`;
  `{ LANDING_SECTIONS, LANDING_LOCALES, isValidSection, isValidLocale, isPlainObject }` из `services/landingSections.js`.

- [ ] **Step 1: Создать ветку**

```bash
cd /c/active-projects/tucan-bot
git fetch origin main
git checkout -b feat/landing-cms origin/main
```

- [ ] **Step 2: Написать падающий тест на вайтлист**

Создать `test/landing-sections.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  LANDING_SECTIONS,
  LANDING_LOCALES,
  isValidSection,
  isValidLocale,
  isPlainObject,
} = require('../services/landingSections');

test('LANDING_SECTIONS: ровно 8 секций снапшота лендинга', () => {
  assert.deepEqual(LANDING_SECTIONS, [
    'header', 'hero', 'about', 'comparison', 'tutors',
    'celpeBras', 'plans', 'footer',
  ]);
});

test('LANDING_SECTIONS: modal исключён — модалка удалена с лендинга', () => {
  assert.equal(LANDING_SECTIONS.includes('modal'), false);
  assert.equal(isValidSection('modal'), false);
});

test('LANDING_LOCALES: ru/en/pt', () => {
  assert.deepEqual(LANDING_LOCALES, ['ru', 'en', 'pt']);
});

test('isValidSection: только из вайтлиста', () => {
  assert.equal(isValidSection('header'), true);
  assert.equal(isValidSection('celpeBras'), true);
  assert.equal(isValidSection('faq'), false);
  assert.equal(isValidSection('__proto__'), false);
  assert.equal(isValidSection(undefined), false);
});

test('isValidLocale: только ru/en/pt', () => {
  assert.equal(isValidLocale('ru'), true);
  assert.equal(isValidLocale('de'), false);
  assert.equal(isValidLocale(undefined), false);
});

test('isPlainObject: объект да, массив и null нет', () => {
  assert.equal(isPlainObject({ a: 1 }), true);
  assert.equal(isPlainObject({}), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
  assert.equal(isPlainObject('x'), false);
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../services/landingSections'`

- [ ] **Step 4: Реализовать вайтлист**

Создать `services/landingSections.js`:

```js
// Чистые вайтлисты контента лендинга. Без БД и без Express — тестируется напрямую.
// Секции соответствуют ключам снапшота лендинга и типам landing/types/index.ts.
//
// Секции `modal` здесь НЕТ: модалка бесплатного урока удалена с лендинга при
// редизайне (решение владельца 2026-07-28), её строки в CMS не хранятся.
const LANDING_SECTIONS = [
  'header', 'hero', 'about', 'comparison', 'tutors',
  'celpeBras', 'plans', 'footer',
];

const LANDING_LOCALES = ['ru', 'en', 'pt'];

function isValidSection(section) {
  return LANDING_SECTIONS.includes(section);
}

function isValidLocale(locale) {
  return LANDING_LOCALES.includes(locale);
}

// data должна быть именно объектом: массив или скаляр сломают форму типов лендинга.
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

module.exports = {
  LANDING_SECTIONS,
  LANDING_LOCALES,
  isValidSection,
  isValidLocale,
  isPlainObject,
};
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npm test`
Expected: PASS — 6 тестов `landing-sections`

- [ ] **Step 6: Написать падающий тест на модель**

Создать `test/landing-model.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LandingContent } = require('../models/landingContent');

test('LandingContent: section — строка, обязательна', () => {
  const attr = LandingContent.rawAttributes.section;
  assert.ok(attr, 'колонка section объявлена в модели');
  assert.equal(attr.allowNull, false);
});

test('LandingContent: locale — enum ru|en|pt, обязательна', () => {
  const attr = LandingContent.rawAttributes.locale;
  assert.ok(attr, 'колонка locale объявлена в модели');
  assert.deepEqual(attr.values, ['ru', 'en', 'pt']);
  assert.equal(attr.allowNull, false);
});

test('LandingContent: data — JSONB, обязательна, дефолт {}', () => {
  const attr = LandingContent.rawAttributes.data;
  assert.ok(attr, 'колонка data объявлена в модели');
  assert.equal(attr.allowNull, false);
  assert.deepEqual(attr.defaultValue, {});
});

test('LandingContent: уникальный индекс (section, locale)', () => {
  const indexes = LandingContent.options.indexes || [];
  const unique = indexes.find((i) => i.unique);
  assert.ok(unique, 'уникальный индекс объявлен');
  assert.deepEqual(unique.fields, ['section', 'locale']);
});

test('LandingContent зарегистрирована в models/index', () => {
  const db = require('../models/index');
  assert.ok(db.LandingContent, 'db.LandingContent доступна');
});
```

- [ ] **Step 7: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../models/landingContent'`

- [ ] **Step 8: Создать модель**

Создать `models/landingContent.js`:

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

// Контент секций лендинга. Одна строка = одна секция в одной локали.
// `data` хранит объект РОВНО в форме TypeScript-типов лендинга
// (landing/types/index.ts) — лендинг читает его без маппинга.
const LandingContent = sequelize.define('LandingContent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  section: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  locale: {
    type: DataTypes.ENUM('ru', 'en', 'pt'),
    allowNull: false,
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
}, {
  indexes: [
    { unique: true, fields: ['section', 'locale'] },
  ],
});

module.exports = { LandingContent };
```

- [ ] **Step 9: Зарегистрировать модель**

В `models/index.js` добавить импорт после строки с `TeacherApplication`:

```js
const { LandingContent } = require('./landingContent'); // Фаза 2: CMS лендинга
```

и добавить в объект `db`:

```js
const db = {
  User,
  TeacherAnketa,
  Application,
  WorkAvailability,
  WeeklyWorkSchedule,
  Lesson,
  Material,
  TeacherApplication,
  LandingContent,
};
```

Ассоциаций у `LandingContent` нет — это самостоятельная таблица без связей с `User`.

- [ ] **Step 10: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS — все тесты, включая 5 новых `landing-model`

- [ ] **Step 11: Коммит**

```bash
git add models/landingContent.js models/index.js services/landingSections.js test/landing-model.test.js test/landing-sections.test.js
git commit -m "feat(landing-cms): модель LandingContent + вайтлист секций"
```

---

### Task 2: Эндпоинты GET/PUT landing-content

**Files:**
- Create: `controllers/landingContentController.js`
- Create: `routes/landingContentRouter.js`
- Modify: `routes/index.js`

**Interfaces:**
- Consumes: `{ LandingContent }` из `models/index`; `{ isValidSection, isValidLocale, isPlainObject, LANDING_LOCALES }` из `services/landingSections`.
- Produces: `GET /api/landing-content?locale=ru` → `{ content: { header: {...}, hero: {...}, ... } }` (объект, ключи — секции; отсутствующие секции просто отсутствуют).
  `PUT /api/landing-content/:section/:locale` с телом `{ data: {...} }` → `{ row: { id, section, locale, data } }`.

- [ ] **Step 1: Создать контроллер**

Создать `controllers/landingContentController.js`:

```js
const ApiError = require('../error/ApiError');
const { LandingContent } = require('../models/index');
const {
  isValidSection,
  isValidLocale,
  isPlainObject,
} = require('../services/landingSections');

class LandingContentController {
  // GET /api/landing-content?locale=ru
  // Отдаёт все секции одной локали одним объектом: { content: { header: {...}, ... } }
  async getByLocale(req, res, next) {
    try {
      const { locale } = req.query;
      if (!isValidLocale(locale)) {
        return next(ApiError.badRequest('Недопустимая локаль: ' + locale));
      }

      const rows = await LandingContent.findAll({ where: { locale } });
      const content = {};
      for (const row of rows) {
        content[row.section] = row.data;
      }

      return res.json({ content });
    } catch (e) {
      console.error('landing getByLocale error:', e);
      next(ApiError.internal(e.message));
    }
  }

  // PUT /api/landing-content/:section/:locale  body: { data: {...} }
  async upsert(req, res, next) {
    try {
      const { section, locale } = req.params;
      const { data } = req.body;

      if (!isValidSection(section)) {
        return next(ApiError.badRequest('Недопустимая секция: ' + section));
      }
      if (!isValidLocale(locale)) {
        return next(ApiError.badRequest('Недопустимая локаль: ' + locale));
      }
      if (!isPlainObject(data)) {
        return next(ApiError.badRequest('Поле data должно быть объектом'));
      }

      const [row] = await LandingContent.findOrCreate({
        where: { section, locale },
        defaults: { section, locale, data },
      });

      if (row.data !== data) {
        row.data = data;
        await row.save();
      }

      return res.json({
        row: {
          id: row.id,
          section: row.section,
          locale: row.locale,
          data: row.data,
        },
      });
    } catch (e) {
      console.error('landing upsert error:', e);
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new LandingContentController();
```

- [ ] **Step 2: Создать роутер**

Создать `routes/landingContentRouter.js`:

```js
const Router = require('express');
const router = new Router();
const landingContentController = require('../controllers/landingContentController');
const authMiddleware = require('../middleware/authMiddleware');
const checkRole = require('../middleware/checkRoleMiddleware');

// Контент лендинга правят только супер-роли.
const ADMIN_ROLES = ['ADMIN', 'OWNER'];

router.get('/', authMiddleware, checkRole(ADMIN_ROLES), landingContentController.getByLocale);
router.put('/:section/:locale', authMiddleware, checkRole(ADMIN_ROLES), landingContentController.upsert);

module.exports = router;
```

> Лендинг читает контент НЕ через этот API, а напрямую из Postgres (как уже читает `TeacherAnketas`), поэтому публичного GET здесь нет — оба маршрута под ADMIN/OWNER.

- [ ] **Step 3: Смонтировать роутер**

В `routes/index.js` добавить импорт после `teacherApplicationRouter`:

```js
const landingContentRouter = require('./landingContentRouter'); // Фаза 2: CMS лендинга
```

и монтирование после строки `router.use('/teacher-application', teacherApplicationRouter);`:

```js
// Фаза 2: контент секций лендинга (ADMIN/OWNER)
router.use('/landing-content', landingContentRouter);
```

- [ ] **Step 4: Проверить, что сервер поднимается и таблица создаётся**

Run: `npm start`
Expected: в логе `🚀 Сервер v1.8.2 запущен на http://localhost:9000` без ошибок Sequelize. `sync({ alter })` создаст таблицу `LandingContents` с уникальным индексом.

Проверить таблицу:

```bash
psql -U $DB_USER -d $DB_NAME -c '\d "LandingContents"'
```

Expected: колонки `id, section, locale, data, createdAt, updatedAt`; индекс `unique (section, locale)`.

- [ ] **Step 5: Проверить guard'ы ролей вручную**

Без токена:

```bash
curl -i "http://localhost:9000/api/landing-content?locale=ru"
```

Expected: `401 {"message":"Не авторизован"}`

С токеном ADMIN/OWNER (взять из localStorage админки, ключ `token`):

```bash
curl -i -H "Authorization: Bearer <TOKEN>" "http://localhost:9000/api/landing-content?locale=ru"
```

Expected: `200 {"content":{}}` — таблица пока пуста.

Плохая локаль:

```bash
curl -i -H "Authorization: Bearer <TOKEN>" "http://localhost:9000/api/landing-content?locale=de"
```

Expected: `400`, сообщение `Недопустимая локаль: de`

- [ ] **Step 6: Проверить запись**

```bash
curl -i -X PUT -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"data":{"nav0":"О тукане","nav1":"Туторы","nav2":"CELPE-BRAS","nav3":"Тарифы"}}' \
  "http://localhost:9000/api/landing-content/header/ru"
```

Expected: `200`, в ответе `row.data.nav1 == "Туторы"`. Повторный тот же запрос должен обновлять ту же строку (id не меняется), а не плодить дубликаты.

Невалидный `data`:

```bash
curl -i -X PUT -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"data":[1,2,3]}' "http://localhost:9000/api/landing-content/header/ru"
```

Expected: `400`, `Поле data должно быть объектом`

- [ ] **Step 7: Коммит**

```bash
git add controllers/landingContentController.js routes/landingContentRouter.js routes/index.js
git commit -m "feat(landing-cms): GET/PUT /api/landing-content под ADMIN/OWNER"
```

---

### Task 3: Revalidate-хук на лендинг

**Files:**
- Create: `utils/revalidateLanding.js`
- Modify: `controllers/landingContentController.js`
- Test: `test/landing-revalidate.test.js`

**Interfaces:**
- Produces: `{ revalidateLanding }` — `async () => { ok: boolean, skipped?: boolean, error?: string }`. **Никогда не бросает** — упавший хук не должен ронять сохранение админа.

- [ ] **Step 1: Написать падающий тест**

Создать `test/landing-revalidate.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { revalidateLanding } = require('../utils/revalidateLanding');

test('без env возвращает skipped, не бросает', async () => {
  const savedUrl = process.env.LANDING_REVALIDATE_URL;
  const savedSecret = process.env.REVALIDATE_SECRET;
  delete process.env.LANDING_REVALIDATE_URL;
  delete process.env.REVALIDATE_SECRET;

  const result = await revalidateLanding();
  assert.equal(result.ok, false);
  assert.equal(result.skipped, true);

  if (savedUrl) process.env.LANDING_REVALIDATE_URL = savedUrl;
  if (savedSecret) process.env.REVALIDATE_SECRET = savedSecret;
});

test('недостижимый хост не бросает, возвращает ok:false', async () => {
  process.env.LANDING_REVALIDATE_URL = 'http://127.0.0.1:1/api/revalidate';
  process.env.REVALIDATE_SECRET = 'test-secret';

  const result = await revalidateLanding();
  assert.equal(result.ok, false);
  assert.equal(result.skipped, undefined);
  assert.ok(result.error, 'ошибка записана в результат');

  delete process.env.LANDING_REVALIDATE_URL;
  delete process.env.REVALIDATE_SECRET;
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../utils/revalidateLanding'`

- [ ] **Step 3: Реализовать хук**

Создать `utils/revalidateLanding.js`:

```js
const axios = require('axios');

/**
 * Дёргает revalidate-хук лендинга, чтобы правка контента появилась сразу,
 * а не через час ISR.
 *
 * НИКОГДА не бросает: если лендинг лежит или env не задан, админ всё равно
 * должен увидеть, что его правка сохранена в БД. Контент подтянется на
 * следующей плановой ревалидации.
 */
async function revalidateLanding() {
  const url = process.env.LANDING_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    console.warn('⚠️  revalidateLanding: LANDING_REVALIDATE_URL или REVALIDATE_SECRET не заданы — пропускаем.');
    return { ok: false, skipped: true };
  }

  try {
    await axios.post(url, {}, {
      headers: { 'x-revalidate-secret': secret },
      timeout: 5000,
    });
    console.log('✅ revalidateLanding: лендинг перегенерирован');
    return { ok: true };
  } catch (e) {
    console.error('❌ revalidateLanding:', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { revalidateLanding };
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npm test`
Expected: PASS — 2 теста `landing-revalidate`

- [ ] **Step 5: Дёрнуть хук после сохранения**

В `controllers/landingContentController.js` добавить импорт под остальными:

```js
const { revalidateLanding } = require('../utils/revalidateLanding');
```

и в методе `upsert`, ПЕРЕД `return res.json({...})`, добавить:

```js
      // Хук не блокирует ответ логически: он не бросает, а его провал
      // означает лишь то, что правка появится на следующей ISR-ревалидации.
      const revalidated = await revalidateLanding();
```

Ответ расширить полем:

```js
      return res.json({
        row: {
          id: row.id,
          section: row.section,
          locale: row.locale,
          data: row.data,
        },
        revalidated: revalidated.ok,
      });
```

- [ ] **Step 6: Проверить, что сохранение работает без env хука**

Запустить сервер БЕЗ `LANDING_REVALIDATE_URL` в `.env` и повторить PUT из Task 2 Step 6.
Expected: `200`, `revalidated: false`, в логе предупреждение `revalidateLanding: ... не заданы`. Строка в БД обновлена.

- [ ] **Step 7: Коммит**

```bash
git add utils/revalidateLanding.js controllers/landingContentController.js test/landing-revalidate.test.js
git commit -m "feat(landing-cms): revalidate-хук лендинга после сохранения контента"
```

---

### Task 4: Скрипт сидинга из снапшота

**Files:**
- Create: `services/landingSeed.js`
- Create: `scripts/seedLandingContent.js`
- Test: `test/landing-seed.test.js`

**Interfaces:**
- Produces: `{ snapshotToRows }` — `(snapshot: object) => Array<{ section, locale, data }>`. Чистая функция, БД не трогает.

- [ ] **Step 1: Написать падающий тест**

Создать `test/landing-seed.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { snapshotToRows } = require('../services/landingSeed');

const SNAPSHOT = {
  ru: {
    header: { nav0: 'О тукане', nav1: 'Туторы', nav2: 'CELPE-BRAS', nav3: 'Тарифы' },
    hero: { heading1: 'Привет', heading2: 'Мир', ctaText: 'Жми', ctaHref: '#' },
  },
  en: {
    header: { nav0: 'About', nav1: 'Tutors', nav2: 'CELPE-BRAS', nav3: 'Plans' },
    hero: { heading1: 'Hi', heading2: 'World', ctaText: 'Go', ctaHref: '#' },
  },
  pt: {
    header: { nav0: 'Sobre nós', nav1: 'Tutores', nav2: 'CELPE-BRAS', nav3: 'Planos' },
    hero: { heading1: 'Oi', heading2: 'Mundo', ctaText: 'Vai', ctaHref: '#' },
  },
};

test('snapshotToRows: секция × локаль для всех локалей', () => {
  const rows = snapshotToRows(SNAPSHOT);
  assert.equal(rows.length, 6, '2 секции × 3 локали');

  const ruHeader = rows.find((r) => r.section === 'header' && r.locale === 'ru');
  assert.ok(ruHeader);
  assert.equal(ruHeader.data.nav1, 'Туторы');

  const ptHero = rows.find((r) => r.section === 'hero' && r.locale === 'pt');
  assert.ok(ptHero);
  assert.equal(ptHero.data.heading1, 'Oi');
});

test('snapshotToRows: неизвестные секции отбрасываются', () => {
  const rows = snapshotToRows({
    ru: { header: { nav0: 'x' }, somethingElse: { a: 1 } },
    en: {},
    pt: {},
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].section, 'header');
});

test('snapshotToRows: секция modal отбрасывается', () => {
  // Снапшот лендинга ещё содержит modal на момент сидинга — его вычищают
  // позже, в лендинг-части. Вайтлист не пускает его в БД уже сейчас.
  const rows = snapshotToRows({
    ru: { header: { nav0: 'x' }, modal: { title: 'Пробный урок' } },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].section, 'header');
});

test('snapshotToRows: неизвестные локали отбрасываются', () => {
  const rows = snapshotToRows({ de: { header: { nav0: 'x' } } });
  assert.equal(rows.length, 0);
});

test('snapshotToRows: пустой снапшот — пустой массив', () => {
  assert.deepEqual(snapshotToRows({}), []);
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../services/landingSeed'`

- [ ] **Step 3: Реализовать трансформацию**

Создать `services/landingSeed.js`:

```js
const {
  isValidSection,
  isValidLocale,
  isPlainObject,
} = require('./landingSections');

/**
 * Разворачивает снапшот лендинга { locale: { section: data } } в плоский
 * список строк таблицы LandingContents. Чистая функция — БД не трогает,
 * поэтому тестируется напрямую.
 *
 * Всё, чего нет в вайтлистах секций и локалей, молча отбрасывается: снапшот
 * приходит из другого репозитория и мог уехать вперёд.
 */
function snapshotToRows(snapshot) {
  const rows = [];
  if (!isPlainObject(snapshot)) return rows;

  for (const [locale, sections] of Object.entries(snapshot)) {
    if (!isValidLocale(locale)) continue;
    if (!isPlainObject(sections)) continue;

    for (const [section, data] of Object.entries(sections)) {
      if (!isValidSection(section)) continue;
      if (!isPlainObject(data)) continue;
      rows.push({ section, locale, data });
    }
  }

  return rows;
}

module.exports = { snapshotToRows };
```

- [ ] **Step 4: Убедиться, что тест проходит**

Run: `npm test`
Expected: PASS — 5 тестов `landing-seed`

- [ ] **Step 5: Написать скрипт сидинга**

Создать `scripts/seedLandingContent.js`:

```js
// Одноразовый сидинг контента лендинга из снапшота в таблицу LandingContents.
//
// Снапшот живёт в ДРУГОМ репозитории (tucanbras/landing), поэтому путь
// передаётся аргументом:
//
//   локально:  node scripts/seedLandingContent.js ../TucanBRAS/landing/lib/notionSnapshot.json
//   на VPS:    node scripts/seedLandingContent.js /var/www/tucanbras-landing/landing/lib/contentSnapshot.json
//
// Идемпотентен: повторный запуск перезаписывает data существующих строк,
// дубликатов не создаёт (уникальный индекс section+locale).
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const sequelize = require('../db');
const { LandingContent } = require('../models/landingContent');
const { snapshotToRows } = require('../services/landingSeed');

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Укажи путь к снапшоту: node scripts/seedLandingContent.js <path/to/snapshot.json>');
    process.exit(1);
  }

  const snapshotPath = path.resolve(process.cwd(), arg);
  if (!fs.existsSync(snapshotPath)) {
    console.error('Файл не найден: ' + snapshotPath);
    process.exit(1);
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  const rows = snapshotToRows(snapshot);
  console.log(`📦 Из снапшота получено строк: ${rows.length}`);

  await sequelize.authenticate();
  await LandingContent.sync({ alter: { drop: false } });

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const [instance, wasCreated] = await LandingContent.findOrCreate({
      where: { section: row.section, locale: row.locale },
      defaults: row,
    });

    if (wasCreated) {
      created += 1;
    } else {
      instance.data = row.data;
      await instance.save();
      updated += 1;
    }
  }

  console.log(`✅ Готово. Создано: ${created}, обновлено: ${updated}.`);
  await sequelize.close();
}

main().catch((e) => {
  console.error('❌ Сидинг упал:', e);
  process.exit(1);
});
```

- [ ] **Step 6: Прогнать сидинг локально**

```bash
node scripts/seedLandingContent.js ../TucanBRAS/landing/lib/notionSnapshot.json
```

Expected: `📦 Из снапшота получено строк: 24`, затем `✅ Готово. Создано: 24, обновлено: 0.`

> 24, а не 27: в снапшоте пока лежат и три секции `modal`, но вайтлист их не пускает — модалка с лендинга удалена.

- [ ] **Step 7: Проверить идемпотентность**

Запустить ту же команду второй раз.
Expected: `Создано: 0, обновлено: 24.` Проверить, что строк по-прежнему 24 и `modal` в таблице нет:

```bash
psql -U $DB_USER -d $DB_NAME -c 'SELECT count(*) FROM "LandingContents";'
psql -U $DB_USER -d $DB_NAME -c "SELECT count(*) FROM \"LandingContents\" WHERE section='modal';"
```

Expected: `24`, затем `0`

- [ ] **Step 8: Проверить, что ребрендинг заехал**

```bash
psql -U $DB_USER -d $DB_NAME -c "SELECT locale, data->>'nav1' FROM \"LandingContents\" WHERE section='header' ORDER BY locale;"
```

Expected: `en | Tutors`, `pt | Tutores`, `ru | Туторы` — «Репетиторы» не должно быть нигде.

- [ ] **Step 9: Коммит**

```bash
git add services/landingSeed.js scripts/seedLandingContent.js test/landing-seed.test.js
git commit -m "feat(landing-cms): скрипт сидинга контента из снапшота лендинга"
```

- [ ] **Step 10: Открыть PR бота**

```bash
git push -u origin feat/landing-cms
gh pr create --repo Raison231/tucan-bot --title "Фаза 2: CMS лендинга — модель, API, сидинг" --body "$(cat <<'EOF'
Фаза 2 отказа от Notion, бот-часть.

- модель `LandingContent (section, locale, data JSONB)` + уникальный индекс `(section, locale)`
- `GET /api/landing-content?locale=` и `PUT /api/landing-content/:section/:locale` под ADMIN/OWNER
- revalidate-хук лендинга после сохранения (никогда не бросает)
- скрипт сидинга 24 строк (8 секций × 3 локали) из снапшота лендинга, идемпотентный
- секции `modal` в вайтлисте нет: модалка бесплатного урока удалена с лендинга

Новые env (обе опциональные — без них хук молча пропускается):
`LANDING_REVALIDATE_URL`, `REVALIDATE_SECRET`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Часть B — админка tucan

Работать в `c:\active-projects\tucan`. **Локальный чекаут на ветке `redesign/onboarding` с незакоммиченными правками онбординга** — их НЕ трогать, ветку CMS создавать от `origin/main`.

### Task 5: Декларативная схема секций

**Files:**
- Create: `src/pages/Profile/AdminOwnerProfile/landingSchema.js`
- Test: `src/pages/Profile/AdminOwnerProfile/landingSchema.test.js`

**Interfaces:**
- Produces: `{ LANDING_SCHEMA, EDITABLE_SECTIONS, LOCALES, emptyValueFor, emptyItemFor }`.
  `LANDING_SCHEMA[section]` = `{ title: string, fields: Field[] }`.
  `Field` = `{ key, label, type }`, где `type` ∈ `'text' | 'textarea' | 'stringList' | 'objectList'`.
  Для `objectList` дополнительно `itemFields: Field[]` и `itemLabel: string`.

- [ ] **Step 1: Создать ветку**

```bash
cd /c/active-projects/tucan
git fetch origin main
git checkout -b feat/landing-cms origin/main
```

- [ ] **Step 2: Написать падающий тест**

Создать `src/pages/Profile/AdminOwnerProfile/landingSchema.test.js`:

```jsx
import { LANDING_SCHEMA, EDITABLE_SECTIONS, LOCALES, emptyValueFor, emptyItemFor } from './landingSchema';

test('EDITABLE_SECTIONS: все 8 секций лендинга', () => {
  expect(EDITABLE_SECTIONS).toEqual([
    'header', 'hero', 'about', 'comparison', 'tutors', 'celpeBras', 'plans', 'footer',
  ]);
});

test('LOCALES: ru/en/pt', () => {
  expect(LOCALES).toEqual(['ru', 'en', 'pt']);
});

test('у каждой редактируемой секции есть заголовок и непустой список полей', () => {
  EDITABLE_SECTIONS.forEach((section) => {
    expect(LANDING_SCHEMA[section]).toBeDefined();
    expect(typeof LANDING_SCHEMA[section].title).toBe('string');
    expect(LANDING_SCHEMA[section].fields.length).toBeGreaterThan(0);
  });
});

test('header описывает ровно 4 пункта навигации', () => {
  const keys = LANDING_SCHEMA.header.fields.map((f) => f.key);
  expect(keys).toEqual(['nav0', 'nav1', 'nav2', 'nav3']);
});

test('plans содержит objectList с вложенными полями тарифа', () => {
  const plansField = LANDING_SCHEMA.plans.fields.find((f) => f.key === 'plans');
  expect(plansField.type).toBe('objectList');
  const itemKeys = plansField.itemFields.map((f) => f.key);
  expect(itemKeys).toEqual(['name', 'priceAmount', 'pricePeriod', 'subtitle', 'features', 'ctaText']);
});

test('footer содержит faqGroups с вложенным списком вопросов', () => {
  const faq = LANDING_SCHEMA.footer.fields.find((f) => f.key === 'faqGroups');
  expect(faq.type).toBe('objectList');
  const items = faq.itemFields.find((f) => f.key === 'items');
  expect(items.type).toBe('objectList');
  expect(items.itemFields.map((f) => f.key)).toEqual(['question', 'answer']);
});

test('emptyValueFor даёт пустое значение нужного вида', () => {
  expect(emptyValueFor({ type: 'text' })).toBe('');
  expect(emptyValueFor({ type: 'textarea' })).toBe('');
  expect(emptyValueFor({ type: 'stringList' })).toEqual([]);
  expect(emptyValueFor({ type: 'objectList', itemFields: [{ key: 'a', type: 'text' }] })).toEqual([]);
});

test('emptyItemFor строит пустой элемент по вложенным полям', () => {
  const field = {
    type: 'objectList',
    itemFields: [
      { key: 'name', type: 'text' },
      { key: 'features', type: 'stringList' },
    ],
  };
  expect(emptyItemFor(field)).toEqual({ name: '', features: [] });
});

test('emptyItemFor: новый тариф совпадает по ключам со схемой', () => {
  const plansField = LANDING_SCHEMA.plans.fields.find((f) => f.key === 'plans');
  expect(Object.keys(emptyItemFor(plansField))).toEqual(
    plansField.itemFields.map((f) => f.key)
  );
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npm test -- --watchAll=false landingSchema`
Expected: FAIL — `Cannot find module './landingSchema'`

- [ ] **Step 4: Написать схему**

Создать `src/pages/Profile/AdminOwnerProfile/landingSchema.js`:

```js
// Декларативное описание полей секций лендинга.
//
// Источник истины по форме данных — landing/types/index.ts. Каждая секция здесь
// повторяет соответствующий интерфейс *Data. Если на лендинге поменяли тип —
// правки нужны и тут, иначе поле просто не появится в форме.
//
// Поля ctaHref в форме НЕТ намеренно: на лендинге они всегда '#'
// (все CTA — якорные скроллы), редактировать их некому и незачем.

export const LOCALES = ['ru', 'en', 'pt'];

// Все секции лендинга редактируемы. Секции `modal` в списке нет и не будет:
// модалка бесплатного урока удалена с лендинга при редизайне.
export const EDITABLE_SECTIONS = [
  'header', 'hero', 'about', 'comparison', 'tutors', 'celpeBras', 'plans', 'footer',
];

export const LANDING_SCHEMA = {
  header: {
    title: 'Шапка',
    fields: [
      { key: 'nav0', label: 'Пункт 1 — о школе', type: 'text' },
      { key: 'nav1', label: 'Пункт 2 — туторы', type: 'text' },
      { key: 'nav2', label: 'Пункт 3 — CELPE-BRAS', type: 'text' },
      { key: 'nav3', label: 'Пункт 4 — тарифы', type: 'text' },
    ],
  },

  hero: {
    title: 'Первый экран',
    fields: [
      { key: 'heading1', label: 'Заголовок, строка 1', type: 'text' },
      { key: 'heading2', label: 'Заголовок, строка 2', type: 'text' },
      { key: 'ctaText', label: 'Текст кнопки', type: 'text' },
    ],
  },

  about: {
    title: 'О школе',
    fields: [
      { key: 'message1', label: 'Заголовок блока 1', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'message2', label: 'Цитата блока 3', type: 'textarea' },
      { key: 'ctaText', label: 'Текст кнопки', type: 'text' },
    ],
  },

  comparison: {
    title: 'Сравнение',
    fields: [
      { key: 'heading', label: 'Заголовок', type: 'text' },
      { key: 'tucanTitle', label: 'Заголовок колонки «Тукан»', type: 'text' },
      { key: 'schoolTitle', label: 'Заголовок колонки «Школа»', type: 'text' },
      { key: 'tucanPros', label: 'Плюсы Тукана', type: 'stringList' },
      { key: 'schoolCons', label: 'Минусы школы', type: 'stringList' },
      { key: 'summaryText', label: 'Итоговая фраза', type: 'textarea' },
    ],
  },

  tutors: {
    title: 'Туторы',
    fields: [
      { key: 'heading1', label: 'Заголовок, строка 1', type: 'text' },
      { key: 'heading2', label: 'Заголовок, строка 2', type: 'text' },
      { key: 'description', label: 'Описание', type: 'textarea' },
      { key: 'ctaText', label: 'Текст кнопки', type: 'text' },
      { key: 'specLabel', label: 'Подпись «Специализации»', type: 'text' },
      { key: 'selectLabel', label: 'Подпись «Выбрать»', type: 'text' },
    ],
  },

  celpeBras: {
    title: 'CELPE-BRAS',
    fields: [
      { key: 'heading', label: 'Заголовок', type: 'text' },
      { key: 'cards', label: 'Карточки (заголовки)', type: 'stringList' },
      { key: 'quote', label: 'Цитата', type: 'textarea' },
      { key: 'hintText', label: 'Подсказка под цитатой', type: 'textarea' },
      { key: 'ctaText', label: 'Текст кнопки', type: 'text' },
    ],
  },

  plans: {
    title: 'Тарифы',
    fields: [
      { key: 'heading1', label: 'Заголовок, строка 1', type: 'text' },
      { key: 'heading2', label: 'Заголовок, строка 2', type: 'text' },
      {
        key: 'plans',
        label: 'Тарифы',
        type: 'objectList',
        itemLabel: 'Тариф',
        itemFields: [
          { key: 'name', label: 'Название', type: 'text' },
          { key: 'priceAmount', label: 'Цена', type: 'text' },
          { key: 'pricePeriod', label: 'Период', type: 'text' },
          { key: 'subtitle', label: 'Подзаголовок', type: 'text' },
          { key: 'features', label: 'Что входит', type: 'stringList' },
          { key: 'ctaText', label: 'Текст кнопки', type: 'text' },
        ],
      },
    ],
  },

  footer: {
    title: 'Подвал и форма',
    fields: [
      { key: 'formTitle', label: 'Заголовок формы', type: 'text' },
      { key: 'formNamePlaceholder', label: 'Плейсхолдер «Имя»', type: 'text' },
      { key: 'formTutorPlaceholder', label: 'Плейсхолдер «Тутор»', type: 'text' },
      { key: 'formPlanPlaceholder', label: 'Плейсхолдер «Тариф»', type: 'text' },
      { key: 'formFreeLessonOption', label: 'Первый пункт списка тарифов', type: 'text' },
      { key: 'formTelegramPlaceholder', label: 'Плейсхолдер «Telegram»', type: 'text' },
      { key: 'formEmailPlaceholder', label: 'Плейсхолдер «Email»', type: 'text' },
      { key: 'formContactError', label: 'Ошибка: нет ни Telegram, ни email', type: 'text' },
      { key: 'formEmailError', label: 'Ошибка: неверный email', type: 'text' },
      { key: 'formErrorMsg', label: 'Ошибка отправки', type: 'text' },
      { key: 'formSubmitText', label: 'Текст кнопки отправки', type: 'text' },
      { key: 'brandDescription', label: 'Описание бренда', type: 'textarea' },
      { key: 'legalTitle', label: 'Заголовок блока документов', type: 'text' },
      { key: 'copyright', label: 'Копирайт', type: 'text' },
      { key: 'allRightsReserved', label: '«Все права защищены»', type: 'text' },
      {
        key: 'faqGroups',
        label: 'FAQ',
        type: 'objectList',
        itemLabel: 'Группа',
        itemFields: [
          { key: 'title', label: 'Название группы', type: 'text' },
          {
            key: 'items',
            label: 'Вопросы',
            type: 'objectList',
            itemLabel: 'Вопрос',
            itemFields: [
              { key: 'question', label: 'Вопрос', type: 'text' },
              { key: 'answer', label: 'Ответ', type: 'textarea' },
            ],
          },
        ],
      },
      {
        key: 'policyLinks',
        label: 'Юридические документы',
        type: 'objectList',
        itemLabel: 'Документ',
        itemFields: [
          { key: 'label', label: 'Название', type: 'text' },
          { key: 'href', label: 'Ссылка', type: 'text' },
        ],
      },
      {
        key: 'socialLinks',
        label: 'Соцсети',
        type: 'objectList',
        itemLabel: 'Соцсеть',
        itemFields: [
          { key: 'label', label: 'Название', type: 'text' },
          { key: 'href', label: 'Ссылка', type: 'text' },
          { key: 'iconUrl', label: 'Путь к иконке', type: 'text' },
        ],
      },
    ],
  },
};

// Пустое значение поля нужного вида — для кнопки «добавить» и для полей,
// которых нет в пришедших из БД данных.
export function emptyValueFor(field) {
  if (field.type === 'stringList' || field.type === 'objectList') return [];
  return '';
}

// Пустой элемент для objectList: рекурсивно по itemFields.
export function emptyItemFor(field) {
  const item = {};
  for (const sub of field.itemFields || []) {
    item[sub.key] = emptyValueFor(sub);
  }
  return item;
}
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npm test -- --watchAll=false landingSchema`
Expected: PASS — 9 тестов

- [ ] **Step 6: Коммит**

```bash
git add src/pages/Profile/AdminOwnerProfile/landingSchema.js src/pages/Profile/AdminOwnerProfile/landingSchema.test.js
git commit -m "feat(landing-cms): декларативная схема секций лендинга"
```

---

### Task 6: Страница «Контент лендинга»

**Files:**
- Create: `src/pages/Profile/AdminOwnerProfile/LandingContentPage.jsx`
- Create: `src/pages/Profile/css/LandingContentPage.css`
- Create: `src/pages/Profile/AdminOwnerProfile/LandingContentPage.test.jsx`
- Modify: `src/utils/consts.js`, `src/components/AppRouter.jsx`, `src/pages/Profile/AdminOwnerProfile/AdminOwnerProfile.jsx`

**Interfaces:**
- Consumes: `{ LANDING_SCHEMA, EDITABLE_SECTIONS, LOCALES, emptyValueFor, emptyItemFor }` из `./landingSchema`; `api` из `../../../http/index`.
- Produces: маршрут `LANDING_CMS_ROUTE = '/landing-content'`, компонент `LandingContentPage` по умолчанию.

- [ ] **Step 1: Добавить константу маршрута**

В `src/utils/consts.js` после строки `export const TEACHER_MODERATION_ROUTE = '/teacher-moderation';` добавить:

```js
export const LANDING_CMS_ROUTE = '/landing-content';
```

- [ ] **Step 2: Написать падающий тест**

Создать `src/pages/Profile/AdminOwnerProfile/LandingContentPage.test.jsx`:

```jsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LandingContentPage from './LandingContentPage';
import { api } from '../../../http/index';

jest.mock('../../../http/index', () => ({
  api: { get: jest.fn(), put: jest.fn() },
}));

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

const RU_CONTENT = {
  header: { nav0: 'О тукане', nav1: 'Туторы', nav2: 'CELPE-BRAS', nav3: 'Тарифы' },
  hero: { heading1: 'Привет', heading2: 'Мир', ctaText: 'Жми', ctaHref: '#' },
};

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: { content: RU_CONTENT } });
  api.put.mockResolvedValue({ data: { row: {}, revalidated: true } });
});

test('загружает контент локали при монтировании', async () => {
  render(<LandingContentPage />);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/landing-content', { params: { locale: 'ru' } }));
});

test('показывает поля выбранной секции с данными из БД', async () => {
  render(<LandingContentPage />);
  await waitFor(() => expect(screen.getByDisplayValue('О тукане')).toBeInTheDocument());
  expect(screen.getByDisplayValue('Туторы')).toBeInTheDocument();
});

test('правка поля и сохранение шлёт PUT с полным объектом секции', async () => {
  render(<LandingContentPage />);
  await waitFor(() => expect(screen.getByDisplayValue('Туторы')).toBeInTheDocument());

  fireEvent.change(screen.getByDisplayValue('Туторы'), { target: { value: 'Наставники' } });
  fireEvent.click(screen.getByRole('button', { name: /сохранить/i }));

  await waitFor(() => expect(api.put).toHaveBeenCalled());
  const [url, body] = api.put.mock.calls[0];
  expect(url).toBe('/landing-content/header/ru');
  expect(body.data.nav1).toBe('Наставники');
  expect(body.data.nav0).toBe('О тукане');
});

test('смена локали перезагружает контент', async () => {
  render(<LandingContentPage />);
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(1));

  fireEvent.change(screen.getByLabelText(/локаль/i), { target: { value: 'en' } });

  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith('/landing-content', { params: { locale: 'en' } })
  );
});

test('секция без строки в БД показывает пустые поля, а не падает', async () => {
  api.get.mockResolvedValue({ data: { content: {} } });
  render(<LandingContentPage />);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  expect(screen.getByLabelText(/пункт 1/i)).toHaveValue('');
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npm test -- --watchAll=false LandingContentPage`
Expected: FAIL — `Cannot find module './LandingContentPage'`

- [ ] **Step 4: Реализовать страницу**

Создать `src/pages/Profile/AdminOwnerProfile/LandingContentPage.jsx`:

```jsx
// src/pages/Profile/AdminOwnerProfile/LandingContentPage.jsx
//
// CMS текстов лендинга. Заменяет Notion: раньше тексты секций жили в базах
// Notion, теперь — в LandingContents (Postgres tukan), правятся отсюда.
//
// Форма строится по декларативной схеме landingSchema.js, а не по сырому JSON:
// админ не должен уметь сломать форму данных, которую лендинг читает без маппинга.
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../../http/index';
import {
  LANDING_SCHEMA,
  EDITABLE_SECTIONS,
  LOCALES,
  emptyValueFor,
  emptyItemFor,
} from './landingSchema';
import '../css/LandingContentPage.css';

const LOCALE_LABELS = { ru: 'Русский', en: 'English', pt: 'Português' };

// Достраивает объект секции до полной схемы: поля, которых нет в БД,
// получают пустое значение нужного вида, иначе input стал бы неуправляемым.
function hydrate(fields, raw) {
  const value = {};
  for (const field of fields) {
    const incoming = raw ? raw[field.key] : undefined;
    if (field.type === 'objectList') {
      value[field.key] = Array.isArray(incoming)
        ? incoming.map((item) => hydrate(field.itemFields, item))
        : [];
    } else if (field.type === 'stringList') {
      value[field.key] = Array.isArray(incoming) ? [...incoming] : [];
    } else {
      value[field.key] = typeof incoming === 'string' ? incoming : emptyValueFor(field);
    }
  }
  return value;
}

const LandingContentPage = () => {
  const [locale, setLocale] = useState('ru');
  const [section, setSection] = useState('header');
  const [content, setContent] = useState({});
  const [form, setForm] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const schema = LANDING_SCHEMA[section];

  const load = useCallback(async (loc) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const res = await api.get('/landing-content', { params: { locale: loc } });
      setContent(res.data?.content || {});
    } catch (e) {
      setContent({});
      setMessage({ type: 'error', text: 'Не удалось загрузить контент: ' + (e.response?.data?.message || e.message) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(locale);
  }, [locale, load]);

  // Пересобираем форму при смене секции или прилёте новых данных.
  useEffect(() => {
    setForm(hydrate(schema.fields, content[section]));
  }, [schema, content, section]);

  const setFieldValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await api.put(`/landing-content/${section}/${locale}`, { data: form });
      setContent((prev) => ({ ...prev, [section]: form }));
      setMessage({
        type: 'success',
        text: res.data?.revalidated
          ? 'Сохранено, лендинг обновлён.'
          : 'Сохранено. Лендинг подтянет правку при следующей ревалидации.',
      });
    } catch (e) {
      setMessage({ type: 'error', text: 'Ошибка сохранения: ' + (e.response?.data?.message || e.message) });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Рендер полей по типу ────────────────────────────────────────────────

  const renderScalar = (field, value, onChange, idPrefix) => {
    const id = `${idPrefix}-${field.key}`;
    if (field.type === 'textarea') {
      return (
        <div className="lcms-field" key={field.key}>
          <label className="lcms-label" htmlFor={id}>{field.label}</label>
          <textarea id={id} className="lcms-textarea" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    }
    return (
      <div className="lcms-field" key={field.key}>
        <label className="lcms-label" htmlFor={id}>{field.label}</label>
        <input id={id} className="lcms-input" type="text" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  };

  const renderStringList = (field, value, onChange, idPrefix) => (
    <div className="lcms-field" key={field.key}>
      <div className="lcms-label">{field.label}</div>
      {value.map((item, i) => (
        <div className="lcms-row" key={i}>
          <input
            className="lcms-input"
            type="text"
            aria-label={`${field.label} — ${i + 1}`}
            value={item}
            onChange={(e) => {
              const next = [...value];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className="lcms-remove"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            Удалить
          </button>
        </div>
      ))}
      <button type="button" className="lcms-add" onClick={() => onChange([...value, ''])}>
        + Добавить
      </button>
    </div>
  );

  const renderObjectList = (field, value, onChange, idPrefix) => (
    <div className="lcms-group" key={field.key}>
      <div className="lcms-group-title">{field.label}</div>
      {value.map((item, i) => (
        <div className="lcms-card" key={i}>
          <div className="lcms-card-head">
            <span>{field.itemLabel} {i + 1}</span>
            <button
              type="button"
              className="lcms-remove"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              Удалить
            </button>
          </div>
          {field.itemFields.map((sub) =>
            renderField(sub, item[sub.key], (v) => {
              const next = [...value];
              next[i] = { ...next[i], [sub.key]: v };
              onChange(next);
            }, `${idPrefix}-${field.key}-${i}`)
          )}
        </div>
      ))}
      <button type="button" className="lcms-add" onClick={() => onChange([...value, emptyItemFor(field)])}>
        + Добавить «{field.itemLabel}»
      </button>
    </div>
  );

  function renderField(field, value, onChange, idPrefix) {
    if (field.type === 'objectList') {
      return renderObjectList(field, Array.isArray(value) ? value : [], onChange, idPrefix);
    }
    if (field.type === 'stringList') {
      return renderStringList(field, Array.isArray(value) ? value : [], onChange, idPrefix);
    }
    return renderScalar(field, typeof value === 'string' ? value : '', onChange, idPrefix);
  }

  return (
    <div className="profile-container page-container">
      <div className="lcms">
        <h1 className="lcms-title">Контент лендинга</h1>

        <div className="lcms-toolbar">
          <div className="lcms-select-wrap">
            <label className="lcms-label" htmlFor="lcms-locale">Локаль</label>
            <select
              id="lcms-locale"
              className="lcms-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
              ))}
            </select>
          </div>

          <div className="lcms-select-wrap">
            <label className="lcms-label" htmlFor="lcms-section">Секция</label>
            <select
              id="lcms-section"
              className="lcms-select"
              value={section}
              onChange={(e) => setSection(e.target.value)}
            >
              {EDITABLE_SECTIONS.map((s) => (
                <option key={s} value={s}>{LANDING_SCHEMA[s].title}</option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className={`lcms-message lcms-message--${message.type}`}>{message.text}</div>
        )}

        {isLoading ? (
          <div className="lcms-loading">Загрузка…</div>
        ) : (
          <>
            <div className="lcms-form">
              {schema.fields.map((field) =>
                renderField(field, form[field.key], (v) => setFieldValue(field.key, v), 'lcms')
              )}
            </div>

            <button
              type="button"
              className="lcms-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LandingContentPage;
```

- [ ] **Step 5: Стили**

Создать `src/pages/Profile/css/LandingContentPage.css`:

```css
/* CMS текстов лендинга. Держимся визуального языка админки:
   светлые карточки, мягкие тени, оранжевый акцент действий. */
.lcms {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 0 96px;
}

.lcms-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 16px;
}

.lcms-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.lcms-select-wrap { flex: 1; }

.lcms-label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
}

.lcms-select,
.lcms-input,
.lcms-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  background: #fff;
}

.lcms-textarea { resize: vertical; }

.lcms-select:focus,
.lcms-input:focus,
.lcms-textarea:focus {
  outline: none;
  border-color: #f69137;
}

.lcms-field { margin-bottom: 14px; }

.lcms-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.lcms-group {
  margin: 20px 0;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fafafa;
}

.lcms-group-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.lcms-card {
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.lcms-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 10px;
}

.lcms-add,
.lcms-remove,
.lcms-save {
  border: none;
  border-radius: 10px;
  font-family: inherit;
  cursor: pointer;
}

.lcms-add {
  padding: 8px 14px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 14px;
}

.lcms-remove {
  padding: 6px 10px;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 13px;
  white-space: nowrap;
}

.lcms-save {
  width: 100%;
  margin-top: 24px;
  padding: 14px;
  background: #f69137;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.lcms-save:disabled { opacity: 0.6; cursor: default; }

.lcms-message {
  padding: 12px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 14px;
}

.lcms-message--success { background: #dcfce7; color: #166534; }
.lcms-message--error { background: #fee2e2; color: #b91c1c; }

.lcms-loading {
  padding: 40px 0;
  text-align: center;
  color: #6b7280;
}
```

- [ ] **Step 6: Убедиться, что тесты проходят**

Run: `npm test -- --watchAll=false LandingContentPage`
Expected: PASS — 5 тестов

- [ ] **Step 7: Зарегистрировать маршрут**

В `src/components/AppRouter.jsx`:

1. Добавить импорт компонента рядом с остальными админ-страницами:

```jsx
import LandingContentPage from '../pages/Profile/AdminOwnerProfile/LandingContentPage';
```

2. Добавить `LANDING_CMS_ROUTE` в импорт из `../utils/consts` (там, где уже импортируется `TEACHER_MODERATION_ROUTE`).

3. В массив `authRoutes` после строки с `TEACHER_MODERATION_ROUTE` добавить:

```jsx
    { path: LANDING_CMS_ROUTE, Component: LandingContentPage },
```

- [ ] **Step 8: Добавить карточку в кабинет**

В `src/pages/Profile/AdminOwnerProfile/AdminOwnerProfile.jsx`:

1. Добавить `LANDING_CMS_ROUTE` в импорт из `../../../utils/consts`.
2. В массив `cards` после карточки `constructor` добавить:

```jsx
    {
      key: 'landing',
      title: 'Контент лендинга',
      desc: 'Тексты секций сайта',
      icon: ConstructorIcon,
      accent: 'purple',
      onClick: () => navigate(LANDING_CMS_ROUTE),
      show: true,
    },
```

> Иконка переиспользуется намеренно — отдельного ассета под CMS в `src/assets/icons/` нет, а заводить новый ради одной карточки не стоит. `show: true` — редактировать контент могут и ADMIN, и OWNER, в отличие от конструктора вопросов.

- [ ] **Step 9: Проверить сборку и всю тестовую сюиту**

Run: `npm test -- --watchAll=false`
Expected: PASS — вся сюита, включая новые тесты

Run: `npm run build`
Expected: `Compiled successfully.`

- [ ] **Step 10: Проверить руками против живого бота**

Поднять бота (`npm start` в `tucan-bot`), запустить админку (`npm start` в `tucan`), зайти под ADMIN/OWNER → кабинет → «Контент лендинга».

Проверить:
1. Секция «Шапка», локаль «Русский» → в полях видны значения из БД, `nav1` = «Туторы».
2. Поменять текст → «Сохранить» → сообщение об успехе.
3. Перезагрузить страницу → правка на месте.
4. Переключить локаль на English → поля перезагрузились английскими значениями.
5. Секция «Тарифы» → добавить тариф, заполнить, сохранить, перезагрузить — тариф на месте.
6. Секция «Подвал и форма» → FAQ: добавить вопрос внутрь группы, сохранить, перезагрузить.

- [ ] **Step 11: Коммит и PR**

```bash
git add src/pages/Profile/AdminOwnerProfile/LandingContentPage.jsx \
        src/pages/Profile/AdminOwnerProfile/LandingContentPage.test.jsx \
        src/pages/Profile/css/LandingContentPage.css \
        src/utils/consts.js src/components/AppRouter.jsx \
        src/pages/Profile/AdminOwnerProfile/AdminOwnerProfile.jsx
git commit -m "feat(landing-cms): раздел «Контент лендинга» в админке"
git push -u origin feat/landing-cms
gh pr create --repo Raison231/tucan --title "Фаза 2: раздел «Контент лендинга» в админке" --body "$(cat <<'EOF'
Фаза 2 отказа от Notion, админ-часть. Требует бот-PR Raison231/tucan-bot (модель + API).

- декларативная схема полей 8 секций (`landingSchema.js`), формы строятся по ней, сырого JSON-редактора нет
- страница «Контент лендинга»: выбор локали и секции, массивы с добавлением/удалением (тарифы, FAQ, буллеты, соцсети, юрдокументы)
- карточка в кабинете админа + маршрут `/landing-content`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

# Часть C — landing

**ПРЕДУСЛОВИЕ ВСЕЙ ЧАСТИ C.** В рабочем дереве `c:\active-projects\TucanBRAS` лежит незакоммиченный редизайн (779+/545− в 21 файле плюс 6 новых). Задачи ниже переписывают `app/[locale]/page.tsx` и переименовывают `lib/notionSnapshot.json` — оба файла редизайн трогает. **Начинать Часть C можно только после того, как редизайн закоммичен.**

- [ ] **Предусловие: убедиться, что дерево чистое**

Run: `cd /c/active-projects/TucanBRAS && git status --porcelain`
Expected: пусто. Если нет — сначала закоммитить редизайн, и только потом продолжать.

---

### Task 7: Чистая логика фолбэка контента

**Files:**
- Create: `landing/lib/contentResolve.ts`
- Test: `landing/lib/contentResolve.test.ts`

**Interfaces:**
- Produces: `resolveSection<T extends object>(row: unknown, fallback: T): T` — сливает строку из БД поверх снапшота; пустые/отсутствующие поля берутся из снапшота.

- [ ] **Step 1: Создать ветку**

```bash
cd /c/active-projects/TucanBRAS
git checkout -b feat/landing-cms
```

- [ ] **Step 2: Написать падающий тест**

Создать `landing/lib/contentResolve.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSection } from './contentResolve'

const FALLBACK = {
  nav0: 'О тукане',
  nav1: 'Туторы',
  nav2: 'CELPE-BRAS',
  nav3: 'Тарифы',
}

test('нет строки в БД — весь фолбэк', () => {
  assert.deepEqual(resolveSection(undefined, FALLBACK), FALLBACK)
  assert.deepEqual(resolveSection(null, FALLBACK), FALLBACK)
})

test('не объект — весь фолбэк', () => {
  assert.deepEqual(resolveSection('строка', FALLBACK), FALLBACK)
  assert.deepEqual(resolveSection([1, 2], FALLBACK), FALLBACK)
})

test('полная строка из БД побеждает фолбэк', () => {
  const row = { nav0: 'A', nav1: 'B', nav2: 'C', nav3: 'D' }
  assert.deepEqual(resolveSection(row, FALLBACK), row)
})

test('частичная строка добирает недостающее из фолбэка', () => {
  const result = resolveSection({ nav0: 'A' }, FALLBACK)
  assert.equal(result.nav0, 'A')
  assert.equal(result.nav1, 'Туторы')
})

test('пустая строка в поле не затирает фолбэк', () => {
  const result = resolveSection({ nav0: '', nav1: 'B' }, FALLBACK)
  assert.equal(result.nav0, 'О тукане')
  assert.equal(result.nav1, 'B')
})

test('пустой массив не затирает непустой фолбэк', () => {
  const fallback = { heading: 'Тарифы', plans: [{ name: 'Один урок' }] }
  const result = resolveSection({ heading: 'Планы', plans: [] }, fallback)
  assert.equal(result.heading, 'Планы')
  assert.deepEqual(result.plans, [{ name: 'Один урок' }])
})

test('непустой массив из БД побеждает', () => {
  const fallback = { plans: [{ name: 'Старый' }] }
  const result = resolveSection({ plans: [{ name: 'Новый' }] }, fallback)
  assert.deepEqual(result.plans, [{ name: 'Новый' }])
})

test('лишние ключи из БД не проникают в результат', () => {
  const result = resolveSection({ nav0: 'A', hacked: 'x' }, FALLBACK)
  assert.equal((result as Record<string, unknown>).hacked, undefined)
})
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `cd landing && npx tsx --test lib/contentResolve.test.ts`
Expected: FAIL — не найден модуль `./contentResolve`

- [ ] **Step 4: Реализовать резолвер**

Создать `landing/lib/contentResolve.ts`:

```ts
/**
 * Слияние строки контента из БД с запечённым снапшотом.
 *
 * Форма результата задаётся ФОЛБЭКОМ, а не строкой из БД: ключи, которых нет
 * в снапшоте, отбрасываются. Это держит контракт с типами лендинга даже если
 * в JSONB попало что-то лишнее.
 *
 * Пустое значение (пустая строка, пустой массив, null, undefined) считается
 * отсутствующим и добирается из снапшота. Урок Фазы 1: частичный ответ CMS
 * обнулял секцию целиком (так CELPE-BRAS терял заголовок), и пофайловый
 * фолбэк по каждому полю оказался единственной надёжной защитой. Цена —
 * поле нельзя намеренно оставить пустым; для текстов лендинга это ровно то
 * поведение, которое нужно.
 */
export function resolveSection<T extends object>(row: unknown, fallback: T): T {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return fallback

  const source = row as Record<string, unknown>
  const result = { ...fallback } as Record<string, unknown>

  for (const key of Object.keys(fallback)) {
    const value = source[key]

    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue

    result[key] = value
  }

  return result as T
}
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npx tsx --test lib/contentResolve.test.ts`
Expected: PASS — 8 тестов

- [ ] **Step 6: Коммит**

```bash
git add landing/lib/contentResolve.ts landing/lib/contentResolve.test.ts
git commit -m "feat(landing-cms): резолвер контента БД↔снапшот"
```

---

### Task 8: Геттеры секций из Postgres

**Files:**
- Create: `landing/lib/content.ts`
- Rename: `landing/lib/notionSnapshot.json` → `landing/lib/contentSnapshot.json`

**Interfaces:**
- Consumes: `pool` из `@/lib/db`; `resolveSection` из `@/lib/contentResolve`; типы из `@/types`.
- Produces: те же сигнатуры, что были у `lib/notion.ts` — `getHeaderData`, `getHeroData`, `getAboutData`, `getComparisonData`, `getTutorsData`, `getCelpeBrasData`, `getPlansData`, `getFooterData`, каждая `(locale: Locale) => Promise<XxxData>`. Геттера модалки нет: `getFreeLessonModalData` не переносится.

- [ ] **Step 1: Переименовать снапшот**

```bash
cd /c/active-projects/TucanBRAS
git mv landing/lib/notionSnapshot.json landing/lib/contentSnapshot.json
```

- [ ] **Step 2: Вычистить из снапшота секцию modal**

Модалка удалена с лендинга — её строки в фолбэке мертвы. Убрать их детерминированно, сохранив форматирование в 2 пробела:

```bash
cd landing
node -e "
const fs = require('fs');
const p = 'lib/contentSnapshot.json';
const snap = JSON.parse(fs.readFileSync(p, 'utf8'));
let removed = 0;
for (const locale of Object.keys(snap)) {
  if (snap[locale].modal) { delete snap[locale].modal; removed++; }
}
fs.writeFileSync(p, JSON.stringify(snap, null, 2) + '\n');
console.log('удалено секций modal:', removed);
"
```

Expected: `удалено секций modal: 3`

Проверить, что осталось ровно 8 секций в каждой локали:

```bash
node -e "
const snap = require('./lib/contentSnapshot.json');
for (const l of Object.keys(snap)) console.log(l, Object.keys(snap[l]).length, Object.keys(snap[l]).sort().join(','));
"
```

Expected: три строки вида `ru 8 about,celpeBras,comparison,footer,header,hero,plans,tutors`

- [ ] **Step 3: Написать модуль контента**

Создать `landing/lib/content.ts`:

```ts
import { cache } from 'react'
import pool from '@/lib/db'
import { resolveSection } from '@/lib/contentResolve'
import snapshot from '@/lib/contentSnapshot.json'
import type {
  Locale,
  HeaderData, HeroData, AboutData, ComparisonData,
  TutorsData, CelpeBrasData, PlansData, FooterData,
} from '@/types'

// ─── Снапшот ─────────────────────────────────────────────────────────────────
// Запечённая копия контента — фолбэк, когда БД недоступна или строки ещё нет.
// Благодаря ему `next build` проходит с выключенным Postgres.

type Snapshot = typeof snapshot
type SectionKey = keyof Snapshot['ru']

function snap(locale: Locale) {
  return (snapshot as Snapshot)[locale] ?? (snapshot as Snapshot).ru
}

// ─── Чтение из БД ────────────────────────────────────────────────────────────

/**
 * Все секции одной локали одним запросом. `cache` из React дедуплицирует
 * вызовы внутри одного рендера: page.tsx дёргает восемь геттеров, а в БД
 * уходит один SELECT.
 *
 * Ошибка БД не бросается наружу — она означает лишь то, что страница
 * соберётся на снапшоте.
 */
const loadLocale = cache(async (locale: Locale): Promise<Record<string, unknown>> => {
  try {
    const { rows } = await pool.query<{ section: string; data: unknown }>(
      'SELECT section, data FROM "LandingContents" WHERE locale = $1',
      [locale],
    )

    const bySection: Record<string, unknown> = {}
    for (const row of rows) bySection[row.section] = row.data
    return bySection
  } catch (e) {
    console.error('[content] Postgres недоступен, отдаём снапшот:', (e as Error).message)
    return {}
  }
})

async function getSection<K extends SectionKey>(
  section: K,
  locale: Locale,
): Promise<Snapshot['ru'][K]> {
  const all = await loadLocale(locale)
  const fallback = snap(locale)[section] as Snapshot['ru'][K]
  return resolveSection(all[section], fallback as object) as Snapshot['ru'][K]
}

// ─── Геттеры секций ──────────────────────────────────────────────────────────
// Сигнатуры повторяют старый lib/notion.ts один в один: page.tsx меняет только
// путь импорта. ctaHref в CMS не хранится — на лендинге все CTA якорные.

export async function getHeaderData(locale: Locale): Promise<HeaderData> {
  return await getSection('header', locale) as HeaderData
}

export async function getHeroData(locale: Locale): Promise<HeroData> {
  const data = await getSection('hero', locale) as HeroData
  return { ...data, ctaHref: '#' }
}

export async function getAboutData(locale: Locale): Promise<AboutData> {
  const data = await getSection('about', locale) as AboutData
  return { ...data, ctaHref: '#' }
}

export async function getComparisonData(locale: Locale): Promise<ComparisonData> {
  return await getSection('comparison', locale) as ComparisonData
}

export async function getTutorsData(locale: Locale): Promise<TutorsData> {
  const data = await getSection('tutors', locale) as TutorsData
  return { ...data, ctaHref: '#' }
}

export async function getCelpeBrasData(locale: Locale): Promise<CelpeBrasData> {
  const data = await getSection('celpeBras', locale) as CelpeBrasData
  return { ...data, ctaHref: '#' }
}

export async function getPlansData(locale: Locale): Promise<PlansData> {
  const data = await getSection('plans', locale) as PlansData
  return {
    ...data,
    plans: (data.plans ?? []).map(plan => ({ ...plan, ctaHref: '#' })),
  }
}

export async function getFooterData(locale: Locale): Promise<FooterData> {
  return await getSection('footer', locale) as FooterData
}
```

> Геттера модалки здесь нет намеренно: `FreeLessonModal` удалён с лендинга, секции `modal` нет ни в снапшоте, ни в CMS.

- [ ] **Step 4: Проверить типы**

Run: `cd landing && npx tsc --noEmit`
Expected: без ошибок в `lib/content.ts`. Ошибки в `page.tsx` про `notionSnapshot.json` ожидаемы — их чинит Task 9.

- [ ] **Step 5: Коммит**

```bash
cd /c/active-projects/TucanBRAS
git add landing/lib/content.ts landing/lib/contentSnapshot.json
git commit -m "feat(landing-cms): lib/content.ts — секции из Postgres со снапшот-фолбэком"
```

---

### Task 9: Перевести page.tsx на CMS, вернуть tutorsNav

**Files:**
- Modify: `landing/app/[locale]/page.tsx`
- Modify: `landing/lib/uiLabels.ts`
- Delete: `landing/lib/notion.ts`, `landing/components/ui/NotionRetry.tsx`

- [ ] **Step 1: Переключить импорты в page.tsx**

В `landing/app/[locale]/page.tsx`:

1. Удалить строку `import NotionRetry from '@/components/ui/NotionRetry'`.
2. Заменить блок импорта геттеров:

```tsx
import {
  getHeaderData,
  getHeroData,
  getAboutData,
  getComparisonData,
  getTutorsData,
  getCelpeBrasData,
  getPlansData,
  getFooterData,
} from '@/lib/content'
```

3. Заменить `import snapshot from '@/lib/notionSnapshot.json'` — **строку удалить целиком**: фолбэк теперь внутри `lib/content.ts`, странице снапшот не нужен.

- [ ] **Step 2: Убрать логику notionFailed**

Удалить весь блок разрешения источников (строки с `const notionFailed = ...` и все восемь строк `const xxxData = notionFailed ? snap.xxx : notionXxx`), а также `const snap = ...`, если он есть.

Переменные, приходящие из `Promise.all`, переименовать из `notionXxx` в `xxxData` — геттеры уже возвращают разрешённые данные. Итоговые два блока загрузки должны выглядеть так:

```tsx
  const [headerData, heroData, aboutData, comparisonData, tutorsData] = await Promise.all([
    getHeaderData(locale),
    getHeroData(locale),
    getAboutData(locale),
    getComparisonData(locale),
    getTutorsData(locale),
  ])

  const [celpeBrasData, plansData, footerData, tutors] = await Promise.all([
    getCelpeBrasData(locale),
    getPlansData(locale),
    getFooterData(locale),
    getTutors(locale).catch(() => []),
  ])
```

> Точный состав двух `Promise.all` мог измениться при редизайне — сохранить фактическое разбиение, поменяв только имена и убрав фолбэк-строки.

- [ ] **Step 3: Вернуть nav1 в CMS**

Заменить блок `navLinks`:

```tsx
  const navLinks = NAV_HREFS.map((href, i) => ({
    href,
    label: headerData[`nav${i}` as keyof typeof headerData],
  }))
```

Комментарий про «owned in code (uiLabels), not Notion» удалить — он описывал обходной путь, которого больше нет: «Туторы» теперь редактируется в админке.

- [ ] **Step 4: Убрать NotionRetry из разметки**

Найти и удалить использование `<NotionRetry ... />` в JSX (если оно есть в текущей версии страницы).

- [ ] **Step 5: Убрать tutorsNav из uiLabels**

В `landing/lib/uiLabels.ts`:

1. Удалить `tutorsNav: string` из интерфейса `UiLabels`.
2. Удалить `tutorsNav: '...'` из всех трёх локалей в `UI_LABELS`.
3. Обновить комментарий шапки:

```ts
// UI strings the landing owns directly. These are chrome — button states, form
// affordances — not editable marketing copy, so they stay in code even after the
// CMS migration. Section texts live in Postgres (LandingContents) and are edited
// in the tucan admin panel.
```

Удалить `import { uiLabels } from '@/lib/uiLabels'` из `page.tsx`, **если** после Step 3 в файле не осталось других обращений к `uiLabels`.

- [ ] **Step 6: Удалить мёртвые модули, включая модалку**

```bash
cd /c/active-projects/TucanBRAS
git rm landing/lib/notion.ts \
       landing/components/ui/NotionRetry.tsx \
       landing/components/ui/FreeLessonModal.tsx
```

`FreeLessonModal.tsx` — 403 строки, которые ничего не импортирует с момента редизайна (проверено: единственная внешняя ссылка на него — комментарий в `TutorAvatar.tsx`).

- [ ] **Step 7: Убрать тип модалки и висячий комментарий**

В `landing/types/index.ts` удалить блок целиком (строки 83–97):

```ts
// ─── FreeLessonModal strings ──────────────────────────────────────────────────
export interface FreeLessonModalStrings {
  ...
}
```

В `landing/components/ui/TutorAvatar.tsx` строка 8 ссылается на удалённый компонент:

```ts
// FreeLessonModal — keep it here so the two forms can't drift apart.
```

Переписать так, чтобы комментарий описывал actual-состояние — аватар используется в `FooterForm` и карусели туторов, второй формы больше нет.

- [ ] **Step 8: Проверить, что ничего не ссылается на удалённое**

Run: `cd landing && npx tsc --noEmit`
Expected: без ошибок.

Run: `grep -rn "lib/notion\|NotionRetry\|notionSnapshot\|notionFailed\|FreeLessonModal\|modalStrings" --include=*.tsx --include=*.ts app components lib types`
Expected: пусто.

- [ ] **Step 9: Собрать с живой БД**

Run: `npm run build`
Expected: `✓ Compiled successfully`, три статические страницы `/ru`, `/en`, `/pt`.

- [ ] **Step 10: Проверить визуально**

Run: `npm start` (или `npm run dev`), открыть `/ru`, `/en`, `/pt`.

Проверить: тексты всех секций на месте; в шапке `nav1` = «Туторы» / «Tutors» / «Tutores»; FAQ в подвале со всеми группами; тарифы с ценами и буллетами. Отдельно убедиться, что нигде не осталось кнопки, открывавшей модалку бесплатного урока.

- [ ] **Step 11: Коммит**

```bash
cd /c/active-projects/TucanBRAS
git add landing/app/\[locale\]/page.tsx landing/lib/uiLabels.ts \
        landing/types/index.ts landing/components/ui/TutorAvatar.tsx
git commit -m "feat(landing-cms): page.tsx читает контент из БД, модалка и tutorsNav-обходной путь удалены"
```

---

### Task 10: Revalidate-роут

**Files:**
- Create: `landing/app/api/revalidate/route.ts`

**Interfaces:**
- Produces: `POST /api/revalidate` с заголовком `x-revalidate-secret` → `{ revalidated: true, paths: string[] }`. Без верного секрета — 401.

- [ ] **Step 1: Написать роут**

Создать `landing/app/api/revalidate/route.ts`:

```ts
import { revalidatePath } from 'next/cache'
import type { Locale } from '@/types'

const LOCALES: Locale[] = ['ru', 'en', 'pt']

/**
 * Хук ревалидации для админки: бот дёргает его после сохранения контента,
 * чтобы правка появилась сразу, а не через час ISR.
 *
 * Секрет сверяется в постоянном по времени порядке не требуется — сравнение
 * идёт с переменной окружения, а не с пользовательскими данными в БД; главная
 * защита в том, что без REVALIDATE_SECRET роут отвечает 401 всегда.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET

  if (!expected) {
    console.error('[revalidate] REVALIDATE_SECRET не задан — отклоняем запрос')
    return Response.json({ message: 'Not configured' }, { status: 401 })
  }

  if (request.headers.get('x-revalidate-secret') !== expected) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const paths = LOCALES.map(locale => `/${locale}`)
  for (const path of paths) revalidatePath(path)

  return Response.json({ revalidated: true, paths })
}
```

- [ ] **Step 2: Проверить без секрета**

Собрать и запустить лендинг, затем:

```bash
curl -i -X POST http://localhost:3000/api/revalidate
```

Expected: `401`

- [ ] **Step 3: Проверить с секретом**

Задать `REVALIDATE_SECRET=dev-secret` в `landing/.env.local`, перезапустить, затем:

```bash
curl -i -X POST -H "x-revalidate-secret: dev-secret" http://localhost:3000/api/revalidate
```

Expected: `200 {"revalidated":true,"paths":["/ru","/en","/pt"]}`

- [ ] **Step 4: Проверить сквозной путь админка → лендинг**

Задать в `.env` бота `LANDING_REVALIDATE_URL=http://localhost:3000/api/revalidate` и `REVALIDATE_SECRET=dev-secret`, перезапустить бота.

В админке поменять заголовок секции «Первый экран» → «Сохранить». Ожидаемое сообщение: «Сохранено, лендинг обновлён.» Обновить `/ru` в браузере — новый текст на месте без ожидания ISR.

- [ ] **Step 5: Коммит**

```bash
git add landing/app/api/revalidate/route.ts
git commit -m "feat(landing-cms): POST /api/revalidate по секрету"
```

---

### Task 11: Выпилить Notion из лендинга

**Files:**
- Modify: `landing/app/api/free-lesson/route.ts`, `landing/package.json`
- Delete: `landing/scripts/snapshot-notion.ts`

- [ ] **Step 1: Убрать Notion из лид-формы**

В `landing/app/api/free-lesson/route.ts`:

1. Удалить `import { Client as NotionClient } from '@notionhq/client'` (строка 2).
2. Удалить `const notion = new NotionClient({ auth: process.env.NOTION_TOKEN })` (строка 61).
3. Удалить функцию `saveToNotion(...)` целиком (начинается на строке 90).
4. В блоке сбора хранилищ (около строк 174–181) удалить ветку, добавляющую `'notion'` в `storageNames` и `saveToNotion(...)` в `storageTasks`.
5. Удалить все оставшиеся обращения к `NOTION_LEADS_DB_ID` и `NOTION_TOKEN` в этом файле — после удаления `saveToNotion` они становятся мёртвыми.

Комментарий про «Notion is only counted…» переписать так, чтобы он описывал оставшиеся хранилища (Postgres + Telegram + Resend), а не Notion.

Проверка, что в файле не осталось Notion:

Run: `grep -ni "notion" app/api/free-lesson/route.ts`
Expected: пусто

- [ ] **Step 2: Удалить снапшот-скрипт и зависимость**

```bash
cd /c/active-projects/TucanBRAS
git rm landing/scripts/snapshot-notion.ts
cd landing
npm uninstall @notionhq/client
```

В `landing/package.json` удалить строку скрипта:

```json
    "snapshot": "tsx --env-file=.env.local scripts/snapshot-notion.ts",
```

- [ ] **Step 3: Добавить скрипт тестов**

В `landing/package.json` в блок `scripts` добавить:

```json
    "test": "tsx --test lib/*.test.ts",
```

- [ ] **Step 4: Убедиться, что Notion нигде не остался**

Run: `grep -rni "notion" --include=*.ts --include=*.tsx --include=*.json app components lib scripts types package.json`
Expected: пусто. Единственные допустимые совпадения — в `docs/` и `CLAUDE.md`, их чинит Фаза 4.

- [ ] **Step 5: Прогнать тесты и сборку**

Run: `npm test`
Expected: PASS — тесты `contentResolve` и `tagTranslations`

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 6: Собраться БЕЗ Notion-переменных в env**

Временно убрать `NOTION_TOKEN` и `NOTION_TEACHERS_DB_ID` из `landing/.env.local`, затем:

Run: `npm run build`
Expected: `✓ Compiled successfully` — это проверка спеки «сборка без `NOTION_*` в env проходит».

- [ ] **Step 7: Собраться с ОСТАНОВЛЕННЫМ Postgres**

Остановить локальный Postgres, затем:

Run: `npm run build`
Expected: `✓ Compiled successfully`; в логе строки `[content] Postgres недоступен, отдаём снапшот`. Открыть собранные страницы — тексты на месте (из снапшота). Это проверка спеки «при остановленном Postgres лендинг собирается на снапшоте».

Запустить Postgres обратно.

- [ ] **Step 8: Коммит и PR**

```bash
cd /c/active-projects/TucanBRAS
git add landing/app/api/free-lesson/route.ts landing/package.json landing/package-lock.json
git commit -m "chore(landing-cms): выпилить Notion из лендинга"
git push -u origin feat/landing-cms
gh pr create --repo cherenkoov/tucanbras --title "Фаза 2: лендинг читает контент из Postgres" --body "$(cat <<'EOF'
Фаза 2 отказа от Notion, лендинг-часть. Требует бот-PR (модель + API + сидинг).

- `lib/notion.ts` → `lib/content.ts`: те же сигнатуры геттеров, чтение из `LandingContents`
- `lib/notionSnapshot.json` → `lib/contentSnapshot.json`, фолбэк ушёл внутрь геттеров
- `NotionRetry.tsx` и логика `notionFailed` в `page.tsx` удалены — источник всегда разрешается
- `POST /api/revalidate` по секрету `REVALIDATE_SECRET`
- `tutorsNav` вернулся из `uiLabels` в CMS
- `FreeLessonModal.tsx` (403 строки мёртвого кода) и тип `FreeLessonModalStrings` удалены — модалка не монтируется с момента редизайна
- Notion выпилен из `/api/free-lesson`, `@notionhq/client` и `scripts/snapshot-notion.ts` удалены

Новая env: `REVALIDATE_SECRET`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

### Task 12: Деплой и приёмка Фазы 2

Порядок деплоя критичен: бот отдаёт API и создаёт таблицу, потом сидинг, потом админка, потом лендинг.

- [ ] **Step 1: Смержить PR в порядке bot → admin → landing**

- [ ] **Step 2: Задать env на VPS**

В `.env` бота (`/var/www/tucan-bot/.env`):

```
LANDING_REVALIDATE_URL=https://tucanbras.com/api/revalidate
REVALIDATE_SECRET=<сгенерировать: openssl rand -hex 32>
```

В `.env.local` лендинга (`/var/www/tucanbras-landing/landing/.env.local`) — **тот же секрет**:

```
REVALIDATE_SECRET=<то же значение>
```

- [ ] **Step 3: Задеплоить бота**

```bash
cd /var/www/tucan-bot
git pull
npm install
pm2 restart tucan-bot
pm2 logs tucan-bot --lines 30
```

Expected: сервер поднялся, `sync({ alter })` создал `LandingContents`.

- [ ] **Step 4: Прогнать сидинг на проде**

```bash
cd /var/www/tucan-bot
node scripts/seedLandingContent.js /var/www/tucanbras-landing/landing/lib/contentSnapshot.json
```

Expected: `📦 Из снапшота получено строк: 24`, `✅ Готово. Создано: 24, обновлено: 0.`

> Если лендинг ещё не задеплоен и файла `contentSnapshot.json` нет — использовать старое имя `notionSnapshot.json` из того же каталога. В нём ещё будут три секции `modal`, но вайтлист их отбросит: число строк одинаково в обоих случаях.

- [ ] **Step 5: Задеплоить админку**

```bash
cd /var/www/tucan
git checkout -- package-lock.json
git pull
npm install
npm run build
```

Expected: `Compiled successfully.`

- [ ] **Step 6: Задеплоить лендинг**

```bash
cd /var/www/tucanbras-landing
git pull origin main
cd landing
npm ci
npm run build
pm2 restart tucanbras-landing
```

Expected: сборка прошла, pm2 перезапустил процесс.

- [ ] **Step 7: Приёмка по критериям спеки**

- [ ] `npm run build` лендинга проходит без `NOTION_*` в env — проверено в Task 11 Step 6, подтвердить на проде отсутствием `NOTION_*` в `.env.local`.
- [ ] `/ru`, `/en`, `/pt` визуально идентичны тому, что было до Фазы 2 (сравнить со скриншотами до деплоя).
- [ ] Правка текста в админке → «Сохранить» → сообщение «Сохранено, лендинг обновлён» → текст на лендинге после обновления страницы, без ожидания часа ISR.
- [ ] При остановленном Postgres лендинг собирается на снапшоте — проверено локально в Task 11 Step 7.
- [ ] В шапке `nav1` = «Туторы» / «Tutors» / «Tutores» на всех трёх локалях.
- [ ] Форма бесплатного урока по-прежнему сохраняет лид: Postgres + Telegram + welcome email.

- [ ] **Step 8: Обновить документацию**

В `landing/CLAUDE.md`:
- Строку стека `CMS | Notion API (@notionhq/client) | 5.17.0` заменить на `CMS | Postgres LandingContents + админка tucan | —`.
- Раздел «Notion как CMS — правила работы» переименовать в «Контент из БД (LandingContents)» и переписать: тексты берутся из `lib/content.ts`, правятся в админке tucan, фолбэк — `lib/contentSnapshot.json`.
- В блоке структуры проекта заменить `lib/notion.ts # Данные всех секций из Notion` на `lib/content.ts # Данные всех секций из Postgres`.
- В «Формы и захват лидов» убрать Notion из пайплайна: `PostgreSQL → Telegram-уведомление → Resend welcome email`.
- Пункт 3 бэклога («Пайплайн учителей: БД ↔ лендинг») отметить закрытым Фазами 1–2.

В корневом `CLAUDE.md`:
- Из таблицы env убрать `NOTION_TOKEN` и `NOTION_TEACHERS_DB_ID`, добавить `REVALIDATE_SECRET` (лендинг + бот) и `LANDING_REVALIDATE_URL` (бот).
- В описании Notion как «административного хаба» — заменить на управление контентом и анкетами в админке tucan.

> Полная зачистка `NOTION_*` из env на VPS и справочных ссылок — Фаза 4.

- [ ] **Step 9: Коммит документации**

```bash
git add CLAUDE.md landing/CLAUDE.md
git commit -m "docs: архитектура без Notion после Фазы 2"
```

---

## Решения, принятые по ходу планирования

1. **`FreeLessonModal` удаляется совсем** (владелец, 2026-07-28). Компонент не монтировался с момента редизайна. Удаляется в Task 9: сам файл (403 строки), тип `FreeLessonModalStrings`, комментарий-отсылка в `TutorAvatar.tsx`; секции `modal` нет в вайтлисте бота, в снапшоте и в CMS. **Правка спеки, которую надо учесть в Фазе 3:** пункт «Хочу стать преподавателем» добавляется только в `FooterForm` — формулировка спеки «в селекте учителя обеих форм (`FreeLessonModal`, `FooterForm`)» больше не соответствует коду. Единственная форма захвата лидов на лендинге теперь — футерная.

## Открытые вопросы

1. **`policyLinks` и `socialLinks` теперь редактируемы.** Раньше их `href` были захардкожены как `'#'` в `getFooterData`, а после сидинга они лежат в JSONB и правятся в админке. Это закрывает два пункта Open Questions из `landing/CLAUDE.md` («Финальные URL соцсетей», «Финальные URL политики конфиденциальности») — но сами URL всё ещё нужно вписать.
