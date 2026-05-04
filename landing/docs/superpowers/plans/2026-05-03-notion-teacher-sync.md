# Notion Teacher Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Синк учителей между Notion (admin interface) и PostgreSQL (Neon), чтобы бот и лендинг всегда отображали актуальные данные из Notion.

**Architecture:** Notion — единственный источник правды для профилей учителей. Netlify Scheduled Function каждые 5 минут читает Notion и делает upsert в PostgreSQL. Бот при создании/обновлении анкеты пишет в Notion API, затем cron синкает обратно в PostgreSQL. Расписание бот пишет только в PostgreSQL и отдельно обновляет текстовое поле в Notion для просмотра.

**Tech Stack:** `@notionhq/client` v5, `pg` (PostgreSQL pool), Netlify Scheduled Functions v2 (`@netlify/functions`), Sequelize (бот), Next.js App Router.

**Spec:** `docs/superpowers/specs/2026-05-03-notion-teacher-sync-design.md`

---

## File Map

### Создать
- `Landing/tucanbras/migrations/005_notion_sync_columns.sql` — новые колонки в TeacherAnketas
- `Landing/tucanbras/netlify/functions/sync-teachers.ts` — Netlify Scheduled Function (cron)
- `tucan-bot-main/services/notionTeacherService.js` — Notion API wrapper для бота

### Изменить
- `Landing/tucanbras/migrations/all_migrations.sql` — добавить 005
- `Landing/tucanbras/lib/tutors.ts` — imageUrl fallback + новые поля в SELECT
- `Landing/tucanbras/next.config.ts` — remote image patterns
- `Landing/tucanbras/netlify.toml` — scheduled function config
- `Landing/tucanbras/package.json` — добавить `@netlify/functions`
- `tucan-bot-main/db.js` — поддержка DATABASE_URL
- `tucan-bot-main/models/teacherAnketa.js` — новые поля Sequelize
- `tucan-bot-main/controllers/teacherAnketaController.js` — запись в Notion при create/update
- `tucan-bot-main/controllers/weeklyWorkScheduleController.js` — расписание → Notion

---

## Шаг 0: Ручная настройка Notion (Prerequisites)

Выполнить вручную перед запуском кода.

- [ ] **0.1 Создать базу данных "Teachers" в Notion**

Создать новую Database в Notion со следующими свойствами:

| Свойство | Тип |
|---|---|
| `fullName` | Title |
| `fullName_en` | Text |
| `fullName_pt` | Text |
| `imageUrl` | URL |
| `gender` | Select → варианты: М, Ж |
| `age` | Number |
| `timezone` | Text |
| `nativeLanguage` | Text |
| `languages` | Multi-select → варианты: pt-BR, ru, en, es, pt-PT |
| `experience` | Number |
| `specializations` | Multi-select |
| `specializations_en` | Text |
| `specializations_pt` | Text |
| `interests` | Multi-select |
| `interests_en` | Text |
| `interests_pt` | Text |
| `quote` | Text |
| `quote_en` | Text |
| `quote_pt` | Text |
| `contactMethods` | Multi-select → варианты: zoom, telegram, google_meet, discord, teams |
| `contactLinks` | Text (JSON строка: `{"zoom":"url","telegram":"@handle"}`) |
| `schedule` | Text (только просмотр, пишет бот) |
| `isPublished` | Checkbox |

- [ ] **0.2 Скопировать ID базы данных**

Из URL базы данных: `https://notion.so/{workspace}/{DATABASE_ID}?v=...`
Скопировать `DATABASE_ID` (32 символа).

- [ ] **0.3 Добавить env vars**

В `Landing/tucanbras/.env.local` (для dev) и Netlify Environment Variables (для прода):
```
NOTION_TEACHERS_DB_ID=<DATABASE_ID>
```

В `tucan-bot-main/.env`:
```
NOTION_TOKEN=<тот же токен что у лендинга>
NOTION_TEACHERS_DB_ID=<тот же DATABASE_ID>
DATABASE_URL=<Neon connection string>  # для прода
```

---

## Task 1: DB Migration — новые колонки

**Files:**
- Create: `Landing/tucanbras/migrations/005_notion_sync_columns.sql`
- Modify: `Landing/tucanbras/migrations/all_migrations.sql`

- [ ] **1.1 Создать файл миграции**

`Landing/tucanbras/migrations/005_notion_sync_columns.sql`:
```sql
-- 005: add Notion sync columns to TeacherAnketas
ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS "notionPageId"  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "imageUrl"      TEXT,
  ADD COLUMN IF NOT EXISTS gender          TEXT,
  ADD COLUMN IF NOT EXISTS age             INTEGER,
  ADD COLUMN IF NOT EXISTS timezone        TEXT,
  ADD COLUMN IF NOT EXISTS "nativeLanguage" TEXT;
```

- [ ] **1.2 Добавить в all_migrations.sql**

Открыть `Landing/tucanbras/migrations/all_migrations.sql` и добавить в конец:
```sql
-- 005_notion_sync_columns
ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS "notionPageId"  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "imageUrl"      TEXT,
  ADD COLUMN IF NOT EXISTS gender          TEXT,
  ADD COLUMN IF NOT EXISTS age             INTEGER,
  ADD COLUMN IF NOT EXISTS timezone        TEXT,
  ADD COLUMN IF NOT EXISTS "nativeLanguage" TEXT;
```

- [ ] **1.3 Применить миграцию**

Выполнить в Neon SQL Editor или через psql:
```bash
psql $DATABASE_URL -f migrations/005_notion_sync_columns.sql
```

Проверить:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'TeacherAnketas'
ORDER BY ordinal_position;
```

Ожидаемый результат: в списке должны быть `notionPageId`, `imageUrl`, `gender`, `age`, `timezone`, `nativeLanguage`.

---

## Task 2: Bot — поддержка DATABASE_URL в db.js

**Files:**
- Modify: `tucan-bot-main/db.js`

- [ ] **2.1 Обновить db.js**

Заменить содержимое `tucan-bot-main/db.js`:
```javascript
const { Sequelize } = require('sequelize');
const { Client } = require('pg');

const dbName     = process.env.DB_NAME;
const dbUser     = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost     = process.env.DB_HOST || 'localhost';
const dbPort     = parseInt(process.env.DB_PORT) || 5432;
const dbUrl      = process.env.DATABASE_URL;

async function createDatabaseIfNotExists() {
  if (dbUrl) return; // Neon — база уже существует
  const client = new Client({
    user: dbUser, password: dbPassword,
    host: dbHost, port: dbPort,
    database: 'postgres',
  });
  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`База "${dbName}" создана`);
    }
  } catch (err) {
    console.error('Ошибка создания базы:', err.message);
  } finally {
    await client.end();
  }
}

const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
      dialect: 'postgres',
      dialectOptions: { ssl: { rejectUnauthorized: false } },
      logging: false,
    })
  : new Sequelize(dbName, dbUser, dbPassword, {
      dialect: 'postgres',
      host: dbHost,
      port: dbPort,
      logging: false,
    });

module.exports = sequelize;
module.exports.createDatabaseIfNotExists = createDatabaseIfNotExists;
```

- [ ] **2.2 Проверить запуск бота**

```bash
cd tucan-bot-main
node bot/start.js
```

Ожидаемый результат: бот стартует без ошибок подключения к БД.

---

## Task 3: Bot — Sequelize модель TeacherAnketa

**Files:**
- Modify: `tucan-bot-main/models/teacherAnketa.js`

- [ ] **3.1 Добавить новые поля в модель**

Заменить содержимое `tucan-bot-main/models/teacherAnketa.js`:
```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const TeacherAnketa = sequelize.define('TeacherAnketa', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId:   { type: DataTypes.INTEGER, allowNull: true, references: { model: 'Users', key: 'id' }, unique: false },
  notionPageId: { type: DataTypes.STRING, allowNull: true, unique: true },
  fullName: { type: DataTypes.STRING, allowNull: false },
  fullName_en: { type: DataTypes.STRING, allowNull: true },
  fullName_pt: { type: DataTypes.STRING, allowNull: true },
  image:    { type: DataTypes.STRING, allowNull: true },
  imageUrl: { type: DataTypes.STRING, allowNull: true },
  languages:       { type: DataTypes.JSON, allowNull: true },
  quote:           { type: DataTypes.TEXT, allowNull: true },
  quote_en:        { type: DataTypes.TEXT, allowNull: true },
  quote_pt:        { type: DataTypes.TEXT, allowNull: true },
  specializations:    { type: DataTypes.JSON, allowNull: true },
  specializations_en: { type: DataTypes.JSON, allowNull: true },
  specializations_pt: { type: DataTypes.JSON, allowNull: true },
  interests:    { type: DataTypes.JSON, allowNull: true },
  interests_en: { type: DataTypes.JSON, allowNull: true },
  interests_pt: { type: DataTypes.JSON, allowNull: true },
  experience: { type: DataTypes.INTEGER, allowNull: true },
  levels:   { type: DataTypes.JSON, allowNull: true },
  contacts: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
  gender:   { type: DataTypes.STRING, allowNull: true },
  age:      { type: DataTypes.INTEGER, allowNull: true },
  timezone: { type: DataTypes.STRING, allowNull: true },
  nativeLanguage: { type: DataTypes.STRING, allowNull: true },
});

module.exports = { TeacherAnketa };
```

> Важно: `userId` теперь `allowNull: true` — учителя из Notion не имеют userId. `unique: false` — убираем unique constraint чтобы не конфликтовало с null.

- [ ] **3.2 Проверить что модель синкается без ошибок**

```bash
cd tucan-bot-main
node -e "const { TeacherAnketa } = require('./models/teacherAnketa'); console.log(TeacherAnketa.rawAttributes)"
```

Ожидаемый результат: выводит объект с полями включая `notionPageId`, `imageUrl`, `gender`.

---

## Task 4: Bot — notionTeacherService.js

**Files:**
- Create: `tucan-bot-main/services/notionTeacherService.js`

- [ ] **4.1 Установить @notionhq/client в бот**

```bash
cd tucan-bot-main
npm install @notionhq/client
```

- [ ] **4.2 Создать сервис**

Создать `tucan-bot-main/services/notionTeacherService.js`:
```javascript
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID  = process.env.NOTION_TEACHERS_DB_ID;

function formatSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') return '';
  return Object.entries(schedule).map(([day, slots]) => {
    if (slots === 'unavailable' || !Array.isArray(slots) || !slots.length)
      return `${day}: недоступен`;
    const times = slots.map(s => `${s.from}:00–${s.to}:00`).join(', ');
    return `${day}: ${times}`;
  }).join('\n');
}

function buildProperties(data) {
  const props = {};

  if (data.fullName !== undefined)
    props.fullName = { title: [{ text: { content: data.fullName || '' } }] };
  if (data.fullName_en !== undefined)
    props.fullName_en = { rich_text: [{ text: { content: data.fullName_en || '' } }] };
  if (data.fullName_pt !== undefined)
    props.fullName_pt = { rich_text: [{ text: { content: data.fullName_pt || '' } }] };
  if (data.imageUrl !== undefined)
    props.imageUrl = { url: data.imageUrl || null };
  if (data.gender !== undefined)
    props.gender = { select: data.gender ? { name: data.gender } : null };
  if (data.age !== undefined)
    props.age = { number: data.age || null };
  if (data.timezone !== undefined)
    props.timezone = { rich_text: [{ text: { content: data.timezone || '' } }] };
  if (data.nativeLanguage !== undefined)
    props.nativeLanguage = { rich_text: [{ text: { content: data.nativeLanguage || '' } }] };
  if (data.languages !== undefined)
    props.languages = {
      multi_select: (data.languages || []).map(l => ({ name: l.code || l })),
    };
  if (data.experience !== undefined)
    props.experience = { number: data.experience || null };
  if (data.specializations !== undefined)
    props.specializations = {
      multi_select: (data.specializations || []).map(s => ({ name: s })),
    };
  if (data.specializations_en !== undefined)
    props.specializations_en = {
      rich_text: [{ text: { content: (data.specializations_en || []).join(' | ') } }],
    };
  if (data.specializations_pt !== undefined)
    props.specializations_pt = {
      rich_text: [{ text: { content: (data.specializations_pt || []).join(' | ') } }],
    };
  if (data.interests !== undefined)
    props.interests = {
      multi_select: (data.interests || []).map(i => ({ name: i })),
    };
  if (data.interests_en !== undefined)
    props.interests_en = {
      rich_text: [{ text: { content: (data.interests_en || []).join(' | ') } }],
    };
  if (data.interests_pt !== undefined)
    props.interests_pt = {
      rich_text: [{ text: { content: (data.interests_pt || []).join(' | ') } }],
    };
  if (data.quote !== undefined)
    props.quote = { rich_text: [{ text: { content: data.quote || '' } }] };
  if (data.quote_en !== undefined)
    props.quote_en = { rich_text: [{ text: { content: data.quote_en || '' } }] };
  if (data.quote_pt !== undefined)
    props.quote_pt = { rich_text: [{ text: { content: data.quote_pt || '' } }] };
  if (data.contacts !== undefined) {
    const methods = (data.contacts || []).map(c => ({ name: c.type }));
    const links = Object.fromEntries((data.contacts || []).map(c => [c.type, c.value]));
    props.contactMethods = { multi_select: methods };
    props.contactLinks   = { rich_text: [{ text: { content: JSON.stringify(links) } }] };
  }

  return props;
}

async function createTeacherPage(anketaData) {
  if (!DB_ID) throw new Error('NOTION_TEACHERS_DB_ID не задан');
  const page = await notion.pages.create({
    parent: { database_id: DB_ID },
    properties: {
      ...buildProperties(anketaData),
      isPublished: { checkbox: true },
    },
  });
  return page.id;
}

async function updateTeacherPage(notionPageId, anketaData) {
  if (!notionPageId) return;
  await notion.pages.update({
    page_id: notionPageId,
    properties: buildProperties(anketaData),
  });
}

async function updateScheduleInNotion(notionPageId, schedule) {
  if (!notionPageId) return;
  const text = formatSchedule(schedule);
  await notion.pages.update({
    page_id: notionPageId,
    properties: {
      schedule: { rich_text: [{ text: { content: text } }] },
    },
  });
}

module.exports = { createTeacherPage, updateTeacherPage, updateScheduleInNotion };
```

- [ ] **4.3 Проверить что модуль загружается**

```bash
cd tucan-bot-main
node -e "const s = require('./services/notionTeacherService'); console.log(Object.keys(s))"
```

Ожидаемый результат: `[ 'createTeacherPage', 'updateTeacherPage', 'updateScheduleInNotion' ]`

---

## Task 5: Bot — teacherAnketaController.js

**Files:**
- Modify: `tucan-bot-main/controllers/teacherAnketaController.js`

- [ ] **5.1 Добавить импорт notionTeacherService**

В начало файла (после строк с `require`):
```javascript
const { createTeacherPage, updateTeacherPage } = require('../services/notionTeacherService');
```

- [ ] **5.2 Обновить метод create()**

Найти строку `return res.json({` в методе `create()` и добавить перед ней блок Notion:
```javascript
      // Пишем в Notion (не блокируем ответ при ошибке)
      try {
        const notionPageId = await createTeacherPage({
          fullName: anketa.fullName,
          languages: anketa.languages,
          quote: anketa.quote,
          specializations: anketa.specializations,
          interests: anketa.interests,
          experience: anketa.experience,
          contacts: anketa.contacts,
        });
        await anketa.update({ notionPageId });
      } catch (notionErr) {
        console.error('Notion create error (non-blocking):', notionErr.message);
      }
```

- [ ] **5.3 Обновить метод update()**

В методе `update()`, после строки `await anketa.save()`, добавить:
```javascript
        // Обновляем Notion (non-blocking)
        try {
          if (anketa.notionPageId) {
            await updateTeacherPage(anketa.notionPageId, {
              fullName: anketa.fullName,
              languages: anketa.languages,
              quote: anketa.quote,
              specializations: anketa.specializations,
              interests: anketa.interests,
              experience: anketa.experience,
              contacts: anketa.contacts,
            });
          }
        } catch (notionErr) {
          console.error('Notion update error (non-blocking):', notionErr.message);
        }
```

- [ ] **5.4 Обновить метод adminUpdate()**

После строки `await anketa.save()` в `adminUpdate()`, добавить аналогичный блок:
```javascript
      // Обновляем Notion (non-blocking)
      try {
        if (anketa.notionPageId) {
          await updateTeacherPage(anketa.notionPageId, {
            fullName: anketa.fullName,
            languages: anketa.languages,
            quote: anketa.quote,
            specializations: anketa.specializations,
            interests: anketa.interests,
            experience: anketa.experience,
            contacts: anketa.contacts,
          });
        }
      } catch (notionErr) {
        console.error('Notion adminUpdate error (non-blocking):', notionErr.message);
      }
```

- [ ] **5.5 Проверить что контроллер загружается без ошибок**

```bash
cd tucan-bot-main
node -e "require('./controllers/teacherAnketaController'); console.log('OK')"
```

Ожидаемый результат: `OK`

---

## Task 6: Bot — weeklyWorkScheduleController.js

**Files:**
- Modify: `tucan-bot-main/controllers/weeklyWorkScheduleController.js`

- [ ] **6.1 Добавить импорт**

В начало файла:
```javascript
const { updateScheduleInNotion } = require('../services/notionTeacherService');
const { TeacherAnketa } = require('../models/index');
```

- [ ] **6.2 Обновить метод save()**

После строки `return res.json({ success: true, created: !!created });` добавить async-блок (вынести в try-catch):

Заменить метод `save()` целиком:
```javascript
  async save(req, res, next) {
    try {
      const userId = req.user.id;
      const { schedule } = req.body;

      if (!schedule || typeof schedule !== 'object') {
        return next(ApiError.badRequest('Некорректный формат расписания'));
      }

      const [record, created] = await WeeklyWorkSchedule.upsert(
        { userId, schedule },
        { returning: true }
      );

      // Обновляем расписание в Notion (только для просмотра, non-blocking)
      try {
        const anketa = await TeacherAnketa.findOne({ where: { userId } });
        if (anketa?.notionPageId) {
          await updateScheduleInNotion(anketa.notionPageId, schedule);
        }
      } catch (notionErr) {
        console.error('Notion schedule update error (non-blocking):', notionErr.message);
      }

      return res.json({ success: true, created: !!created });
    } catch (e) {
      console.error('Ошибка сохранения расписания:', e);
      next(ApiError.internal('Ошибка сохранения расписания'));
    }
  }
```

- [ ] **6.3 Проверить загрузку**

```bash
cd tucan-bot-main
node -e "require('./controllers/weeklyWorkScheduleController'); console.log('OK')"
```

Ожидаемый результат: `OK`

---

## Task 7: Landing — Netlify Scheduled Function

**Files:**
- Modify: `Landing/tucanbras/package.json` — добавить `@netlify/functions`
- Create: `Landing/tucanbras/netlify/functions/sync-teachers.ts`

- [ ] **7.1 Установить @netlify/functions**

```bash
cd Landing/tucanbras
npm install --save-dev @netlify/functions
```

- [ ] **7.2 Создать директорию**

```bash
mkdir -p Landing/tucanbras/netlify/functions
```

- [ ] **7.3 Создать файл sync-teachers.ts**

`Landing/tucanbras/netlify/functions/sync-teachers.ts`:
```typescript
import type { Config } from '@netlify/functions'
import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { Pool } from 'pg'

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DB_ID  = process.env.NOTION_TEACHERS_DB_ID!

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getText(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  if (!p) return null
  if (p.type === 'title')     return p.title.map(t => t.plain_text).join('') || null
  if (p.type === 'rich_text') return p.rich_text.map(t => t.plain_text).join('') || null
  return null
}

function getNumber(page: PageObjectResponse, key: string): number | null {
  const p = page.properties[key]
  return p?.type === 'number' ? p.number : null
}

function getSelect(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  return p?.type === 'select' ? (p.select?.name ?? null) : null
}

function getMultiSelect(page: PageObjectResponse, key: string): string[] {
  const p = page.properties[key]
  return p?.type === 'multi_select' ? p.multi_select.map(o => o.name) : []
}

function getUrl(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  return p?.type === 'url' ? p.url : null
}

function parseArr(text: string | null): string[] {
  if (!text) return []
  return text.split(' | ').filter(Boolean)
}

function parseContacts(page: PageObjectResponse): object[] {
  const methods = getMultiSelect(page, 'contactMethods')
  const linksText = getText(page, 'contactLinks') ?? '{}'
  let links: Record<string, string> = {}
  try { links = JSON.parse(linksText) } catch { links = {} }
  return methods.map(type => ({ type, value: links[type] ?? '' }))
}

function mapPageToRow(page: PageObjectResponse) {
  return {
    notionPageId:       page.id,
    fullName:           getText(page, 'fullName') ?? '',
    fullName_en:        getText(page, 'fullName_en'),
    fullName_pt:        getText(page, 'fullName_pt'),
    imageUrl:           getUrl(page, 'imageUrl'),
    gender:             getSelect(page, 'gender'),
    age:                getNumber(page, 'age'),
    timezone:           getText(page, 'timezone'),
    nativeLanguage:     getText(page, 'nativeLanguage'),
    languages:          JSON.stringify(getMultiSelect(page, 'languages').map(code => ({ code }))),
    experience:         getNumber(page, 'experience'),
    specializations:    JSON.stringify(getMultiSelect(page, 'specializations')),
    specializations_en: JSON.stringify(parseArr(getText(page, 'specializations_en'))),
    specializations_pt: JSON.stringify(parseArr(getText(page, 'specializations_pt'))),
    interests:          JSON.stringify(getMultiSelect(page, 'interests')),
    interests_en:       JSON.stringify(parseArr(getText(page, 'interests_en'))),
    interests_pt:       JSON.stringify(parseArr(getText(page, 'interests_pt'))),
    quote:              getText(page, 'quote'),
    quote_en:           getText(page, 'quote_en'),
    quote_pt:           getText(page, 'quote_pt'),
    contacts:           JSON.stringify(parseContacts(page)),
  }
}

// ─── Main sync ────────────────────────────────────────────────────────────────

async function syncTeachers() {
  // 1. Fetch all published teachers from Notion
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  do {
    const res = await notion.databases.query({
      database_id: DB_ID,
      filter: { property: 'isPublished', checkbox: { equals: true } },
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...(res.results as PageObjectResponse[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  const notionIds = pages.map(p => p.id)

  let inserted = 0, updated = 0, deleted = 0

  // 2. Upsert each page into PostgreSQL
  for (const page of pages) {
    const row = mapPageToRow(page)
    await pool.query(
      `INSERT INTO "TeacherAnketas"
         ("notionPageId", "fullName", "fullName_en", "fullName_pt",
          "imageUrl", gender, age, timezone, "nativeLanguage",
          languages, experience,
          specializations, specializations_en, specializations_pt,
          interests, interests_en, interests_pt,
          quote, quote_en, quote_pt, contacts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT ("notionPageId") DO UPDATE SET
         "fullName"          = EXCLUDED."fullName",
         "fullName_en"       = EXCLUDED."fullName_en",
         "fullName_pt"       = EXCLUDED."fullName_pt",
         "imageUrl"          = EXCLUDED."imageUrl",
         gender              = EXCLUDED.gender,
         age                 = EXCLUDED.age,
         timezone            = EXCLUDED.timezone,
         "nativeLanguage"    = EXCLUDED."nativeLanguage",
         languages           = EXCLUDED.languages,
         experience          = EXCLUDED.experience,
         specializations     = EXCLUDED.specializations,
         specializations_en  = EXCLUDED.specializations_en,
         specializations_pt  = EXCLUDED.specializations_pt,
         interests           = EXCLUDED.interests,
         interests_en        = EXCLUDED.interests_en,
         interests_pt        = EXCLUDED.interests_pt,
         quote               = EXCLUDED.quote,
         quote_en            = EXCLUDED.quote_en,
         quote_pt            = EXCLUDED.quote_pt,
         contacts            = EXCLUDED.contacts`,
      [
        row.notionPageId, row.fullName, row.fullName_en, row.fullName_pt,
        row.imageUrl, row.gender, row.age, row.timezone, row.nativeLanguage,
        row.languages, row.experience,
        row.specializations, row.specializations_en, row.specializations_pt,
        row.interests, row.interests_en, row.interests_pt,
        row.quote, row.quote_en, row.quote_pt, row.contacts,
      ]
    )
    inserted++
  }

  // 3. Delete records that are no longer in Notion (only Notion-managed ones)
  if (notionIds.length > 0) {
    const res = await pool.query(
      `DELETE FROM "TeacherAnketas"
       WHERE "notionPageId" IS NOT NULL
         AND "notionPageId" != ALL($1::text[])
       RETURNING id`,
      [notionIds]
    )
    deleted = res.rowCount ?? 0
  }

  return { inserted, updated, deleted, total: pages.length }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async () => {
  try {
    if (!DB_ID) {
      console.error('NOTION_TEACHERS_DB_ID не задан — пропускаем синк')
      return new Response('NOTION_TEACHERS_DB_ID missing', { status: 500 })
    }
    const result = await syncTeachers()
    console.log(`Синк учителей завершён:`, result)
    return new Response(JSON.stringify(result), { status: 200 })
  } catch (err: any) {
    console.error('Синк учителей — ошибка:', err.message)
    return new Response(err.message, { status: 500 })
  }
}

export const config: Config = {
  schedule: '*/5 * * * *',
}
```

---

## Task 8: Landing — конфигурация

**Files:**
- Modify: `Landing/tucanbras/netlify.toml`
- Modify: `Landing/tucanbras/next.config.ts`

- [ ] **8.1 Обновить netlify.toml**

Заменить содержимое `Landing/tucanbras/netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"

[functions]
  directory = "netlify/functions"
```

- [ ] **8.2 Обновить next.config.ts**

Заменить содержимое `Landing/tucanbras/next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['26.93.*.*', '192.168.*.*', '10.*.*.*', '172.*.*.*'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '*.imgbb.com' },
    ],
  },
};

export default nextConfig;
```

> Если используется другой хостинг для фото — добавить его hostname в список.

- [ ] **8.3 Проверить сборку**

```bash
cd Landing/tucanbras
npm run build
```

Ожидаемый результат: сборка без ошибок TypeScript.

---

## Task 9: Landing — lib/tutors.ts

**Files:**
- Modify: `Landing/tucanbras/lib/tutors.ts`

- [ ] **9.1 Добавить imageUrl в TutorRow и SELECT**

Обновить `Landing/tucanbras/lib/tutors.ts`:
```typescript
import pool from './db'
import { resolveLanguage, type Language } from './languages'
import type { Locale } from '@/types'

export interface Tutor {
  id: number
  fullName: string
  imageUrl: string | null
  languages: Language[]
  quote: string | null
  specializations: string[]
  interests: string[]
}

type TutorRow = {
  id: number
  fullName: string
  fullName_en: string | null
  fullName_pt: string | null
  image: string | null
  imageUrl: string | null
  languages: { code?: string; flag?: string; name?: string }[] | null
  quote: string | null
  quote_en: string | null
  quote_pt: string | null
  specializations: string[] | null
  specializations_en: string[] | null
  specializations_pt: string[] | null
  interests: string[] | null
  interests_en: string[] | null
  interests_pt: string[] | null
}

function pick(ru: string | null, en: string | null, pt: string | null, locale: Locale): string | null {
  if (locale === 'en') return en || ru
  if (locale === 'pt') return pt || ru
  return ru
}

function pickArr(ru: string[] | null, en: string[] | null, pt: string[] | null, locale: Locale): string[] {
  if (locale === 'en') return en?.length ? en : (ru ?? [])
  if (locale === 'pt') return pt?.length ? pt : (ru ?? [])
  return ru ?? []
}

export async function getTutors(locale: Locale = 'en'): Promise<Tutor[]> {
  const { rows } = await pool.query<TutorRow>(`
    SELECT
      id, "fullName", "fullName_en", "fullName_pt",
      image, "imageUrl", languages,
      quote, quote_en, quote_pt,
      specializations, specializations_en, specializations_pt,
      interests, interests_en, interests_pt
    FROM "TeacherAnketas"
    ORDER BY id ASC
  `)

  const botBaseUrl = process.env.BOT_BASE_URL ?? ''

  return rows.map(row => ({
    id:              row.id,
    fullName:        pick(row.fullName, row.fullName_en, row.fullName_pt, locale) ?? row.fullName,
    imageUrl:        row.imageUrl ?? (row.image ? `${botBaseUrl}/static/${row.image}` : null),
    languages:       (row.languages ?? []).map(resolveLanguage),
    quote:           pick(row.quote, row.quote_en, row.quote_pt, locale),
    specializations: pickArr(row.specializations, row.specializations_en, row.specializations_pt, locale),
    interests:       pickArr(row.interests, row.interests_en, row.interests_pt, locale),
  }))
}
```

- [ ] **9.2 Проверить TypeScript**

```bash
cd Landing/tucanbras
npx tsc --noEmit
```

Ожидаемый результат: 0 ошибок.

---

## Task 10: Финальная проверка

- [ ] **10.1 Тест синка вручную**

Создать тестового учителя в Notion Teachers DB (заполнить `fullName`, поставить `isPublished = true`).

Запустить функцию синка локально (опционально, если настроен Netlify CLI):
```bash
cd Landing/tucanbras
npx netlify functions:invoke sync-teachers
```

Или проверить через SQL напрямую после деплоя.

- [ ] **10.2 Проверить появление учителя в PostgreSQL**

```sql
SELECT id, "fullName", "notionPageId", "imageUrl"
FROM "TeacherAnketas"
WHERE "notionPageId" IS NOT NULL;
```

Ожидаемый результат: строка с данными тестового учителя из Notion.

- [ ] **10.3 Проверить лендинг**

Открыть секцию Tutors на лендинге — тестовый учитель должен отображаться.

- [ ] **10.4 Проверить удаление**

Снять галочку `isPublished` у тестового учителя в Notion. Дождаться следующего синка (≤5 мин). Проверить:
```sql
SELECT COUNT(*) FROM "TeacherAnketas" WHERE "notionPageId" = '<id тестового учителя>';
```

Ожидаемый результат: `0`.

---

## Self-Review

**Spec coverage:**
- ✅ Флоу 1 (Notion → PG): Task 7 (cron)
- ✅ Флоу 2 (Bot → Notion → PG): Tasks 4, 5
- ✅ Изменения: Tasks 5, 6
- ✅ Удаление/скрытие: Task 7 (шаг 3 — DELETE)
- ✅ Расписание → Notion: Task 6
- ✅ Единая БД Neon: Task 2 (DATABASE_URL)
- ✅ imageUrl fallback: Task 9
- ✅ Новые колонки: Task 1
- ✅ Sequelize модель обновлена: Task 3
- ✅ next.config.ts remotePatterns: Task 8

**Проверено:**
- Ошибки Notion не блокируют ответы бота (try/catch, non-blocking)
- NULL notionPageId не затрагивается DELETE в cron
- userId теперь nullable для Notion-учителей
