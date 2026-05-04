# Notion Teacher Sync — Design Spec

**Date:** 2026-05-03  
**Status:** Approved

---

## Цель

Сделать Notion единым admin-интерфейсом для управления анкетами учителей. Любые изменения в Notion автоматически появляются в PostgreSQL и во всех приложениях (лендинг, Mini App, бот). Учитель также может создать анкету через бота — она сразу попадает в Notion и далее синкается в PostgreSQL.

---

## Архитектура: два слоя

```
┌─────────────────────────────────────────────────┐
│  NOTION — admin layer                           │
│  Кто работает: администраторы школы             │
│  Что делают: создают/редактируют учителей,      │
│  смотрят расписания, управляют публикацией      │
└──────────────────┬──────────────────────────────┘
                   │ cron-синк (каждые 5 мин)
                   ▼
┌─────────────────────────────────────────────────┐
│  POSTGRESQL — operational layer                 │
│                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Бот    │  │ Mini App │  │   Лендинг    │  │
│  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────┘
```

**Notion** = интерфейс для людей (администраторов)  
**PostgreSQL** = интерфейс для машин (приложений)

Cron — мост Notion → PostgreSQL. Бот дополнительно пишет расписание обратно в Notion (только для отображения).

> Бот и лендинг используют **одну БД в продакшне**. Cron пишет в неё — изменения сразу видны и лендингу, и боту, и Mini App.

---

## Два флоу создания учителя

### Флоу 1: через Notion
```
Админ создаёт страницу в Notion Teachers DB
  → cron (≤5 мин) обнаруживает новую запись
  → upsert в PostgreSQL TeacherAnketas
  → лендинг / Mini App / бот читают из PostgreSQL
```

### Флоу 2: через бота
```
Учитель проходит onboarding в боте
  → бот вызывает Notion API: создаёт страницу в Teachers DB
  → сохраняет notionPageId в PostgreSQL
  → cron (≤5 мин) синкает обратно в PostgreSQL (обновляет все поля)
  → лендинг / Mini App / бот читают из PostgreSQL
```

### Изменения профиля
```
Через Notion: меняем поле → cron обновляет PostgreSQL
Через бота:   бот обновляет страницу в Notion → cron обновляет PostgreSQL
```

### Удаление / скрытие
```
Notion: ставим isPublished=false или удаляем страницу
  → cron удаляет запись из PostgreSQL
  → учитель исчезает со всех платформ
```

### Расписание (специальный случай)
```
Учитель меняет расписание через бота
  → бот обновляет WeeklyWorkSchedules в PostgreSQL
  → бот обновляет поле schedule в Notion (текстовый формат, только для просмотра)
```

---

## Notion — база данных "Teachers"

Создаётся вручную в Notion. `notionPageId` = ID страницы (автоматически, не поле базы).

| Поле | Тип Notion | Описание |
|---|---|---|
| `fullName` | Title | ФИО на русском |
| `fullName_en` | Text | ФИО на английском |
| `fullName_pt` | Text | ФИО на португальском |
| `imageUrl` | URL | Внешняя ссылка на фото (Cloudinary, Google Drive и т.п.) |
| `gender` | Select (М / Ж) | Пол |
| `age` | Number | Возраст |
| `timezone` | Select (GMT±N) | Часовой пояс |
| `nativeLanguage` | Select | Родной язык |
| `languages` | Multi-select | Языки преподавания (с уровнями через `:`, напр. `pt-BR:C2`) |
| `experience` | Number | Стаж преподавания (лет) |
| `specializations` | Multi-select | Специализации (ru) |
| `specializations_en` | Text | Специализации pipe-separated `A \| B \| C` (en) |
| `specializations_pt` | Text | Специализации pipe-separated (pt) |
| `interests` | Multi-select | Интересы (ru) |
| `interests_en` | Text | Интересы pipe-separated (en) |
| `interests_pt` | Text | Интересы pipe-separated (pt) |
| `quote` | Text | О себе (ru) |
| `quote_en` | Text | О себе (en) |
| `quote_pt` | Text | О себе (pt) |
| `contactMethods` | Multi-select | Способы связи: Zoom, Telegram, Google Meet, Discord, Teams |
| `contactLinks` | Text | Ссылки через запятую или JSON `{"zoom":"...","telegram":"..."}` |
> При синке `contactMethods` + `contactLinks` объединяются в существующее поле `contacts` формата `[{type, value}]`.|
| `schedule` | Text | Читаемое расписание — **только просмотр**, пишет бот |
| `isPublished` | Checkbox | Опубликован ли учитель на всех платформах |

---

## PostgreSQL — изменения в `TeacherAnketas`

> **Важно:** бот и лендинг используют одну БД в продакшне. Изменения применяются один раз.

### Уже существуют (не трогать)

| Колонка | Тип | Примечание |
|---|---|---|
| `fullName` | TEXT NOT NULL | Имя (ru) |
| `fullName_en` | TEXT | Имя (en) — добавлено миграцией 002 |
| `fullName_pt` | TEXT | Имя (pt) — добавлено миграцией 002 |
| `image` | TEXT | Имя файла на сервере бота (`anketa_123.jpg`) |
| `languages` | JSONB | Языки преподавания |
| `quote` | TEXT | О себе (ru) |
| `quote_en` | TEXT | О себе (en) — добавлено миграцией 001 |
| `quote_pt` | TEXT | О себе (pt) — добавлено миграцией 001 |
| `specializations` | TEXT[] | Специализации (ru) |
| `specializations_en` | TEXT[] | Специализации (en) — миграция 001 |
| `specializations_pt` | TEXT[] | Специализации (pt) — миграция 001 |
| `interests` | TEXT[] | Интересы (ru) |
| `interests_en` | TEXT[] | Интересы (en) — миграция 001 |
| `interests_pt` | TEXT[] | Интересы (pt) — миграция 001 |
| `experience` | INTEGER | Стаж (лет) — из Sequelize модели бота |
| `levels` | JSONB | Уровни (A0–C2) — из Sequelize модели бота |
| `contacts` | JSONB | `[{type:"zoom", value:"ссылка"}, ...]` — из Sequelize модели бота |

### Добавить новой миграцией `005_notion_sync_columns.sql`

| Колонка | Тип | Nullable | Описание |
|---|---|---|---|
| `notionPageId` | TEXT UNIQUE | yes | ID страницы в Notion (ключ синка) |
| `imageUrl` | TEXT | yes | Внешняя ссылка на фото (для Notion-учителей) |
| `gender` | TEXT | yes | Пол |
| `age` | INTEGER | yes | Возраст |
| `timezone` | TEXT | yes | Часовой пояс (GMT±N) |
| `nativeLanguage` | TEXT | yes | Родной язык |

### Маппинг contactMethods + contactLinks → `contacts`

Поле `contacts` уже существует и понятно боту/Mini App. При синке из Notion объединяем два Notion-поля в один JSON:

```json
[
  { "type": "zoom",     "value": "https://zoom.us/j/123" },
  { "type": "telegram", "value": "@username" }
]
```

Отдельные колонки `contactMethods` и `contactLinks` не создаём.

### imageUrl fallback в `lib/tutors.ts`

```typescript
imageUrl: row.imageUrl ?? (row.image ? `${botBaseUrl}/static/${row.image}` : null)
```

Учителя из бота используют `image` (файл на сервере). Учителя из Notion используют `imageUrl` (внешняя ссылка).

---

## Netlify Scheduled Function — cron синк

**Расположение:** `Landing/tucanbras/netlify/functions/sync-teachers.ts`  
**Расписание:** каждые 5 минут (`*/5 * * * *`)  
**Конфиг:** `netlify.toml` — добавить секцию `[functions."sync-teachers"]`

### Алгоритм

```
1. Fetch всех страниц из Notion Teachers DB (только isPublished=true)
2. Получить все notionPageId из PostgreSQL TeacherAnketas
3. Для каждой страницы из Notion:
   a. Если notionPageId есть в PostgreSQL → UPDATE запись
   b. Если notionPageId нет → INSERT новую запись
      (userId = null для Notion-созданных учителей)
4. Для каждой записи PostgreSQL, чей notionPageId отсутствует в Notion:
   → DELETE из PostgreSQL
5. Логировать: добавлено N, обновлено N, удалено N
```

### Маппинг полей Notion → PostgreSQL

```typescript
{
  fullName:           title → fullName
  fullName_en:        text  → fullName_en
  fullName_pt:        text  → fullName_pt
  imageUrl:           url   → imageUrl
  gender:             select → gender
  age:                number → age
  timezone:           select → timezone
  nativeLanguage:     select → nativeLanguage
  languages:          multi-select → languages (JSON array)
  experience:         number → experience
  specializations:    multi-select → specializations (JSON array)
  specializations_en: text (split " | ") → specializations_en (JSON array)
  specializations_pt: text (split " | ") → specializations_pt (JSON array)
  interests:          multi-select → interests (JSON array)
  interests_en:       text (split " | ") → interests_en (JSON array)
  interests_pt:       text (split " | ") → interests_pt (JSON array)
  quote:              text → quote
  quote_en:           text → quote_en
  quote_pt:           text → quote_pt
  contactMethods:     multi-select → contactMethods (JSON array)
  contactLinks:       text (parse JSON) → contactLinks (JSON)
  notionPageId:       page.id → notionPageId
}
```

> `schedule` не синкается из Notion в PostgreSQL — оно пишется ботом в Notion только для отображения.

---

## Бот — изменения в `tucan-bot-main`

### Новая зависимость
```
npm install @notionhq/client
```

### Новый модуль `services/notionTeacherService.js`

Функции:
- `createTeacherPage(anketaData)` → создаёт страницу в Notion, возвращает `notionPageId`
- `updateTeacherPage(notionPageId, anketaData)` → обновляет страницу
- `updateScheduleInNotion(notionPageId, schedule)` → обновляет поле `schedule` текстом

### Изменения в `teacherAnketaController.js`

- `create()`: после сохранения в PostgreSQL — вызвать `createTeacherPage()`, сохранить `notionPageId`
- `update()` / `adminUpdate()`: после сохранения — вызвать `updateTeacherPage()`
- Ошибки Notion не блокируют ответ бота (try/catch, логируем, не бросаем)

### Изменения в `weeklyWorkScheduleController.js`

- После сохранения расписания — вызвать `updateScheduleInNotion()` с читаемым текстом

---

## Лендинг — изменения

Минимальные. `lib/tutors.ts` уже читает из PostgreSQL и уже ожидает поля `fullName_en`, `fullName_pt` и т.д. После добавления колонок в PostgreSQL лендинг заработает автоматически.

**Добавить в `next.config.ts`:** домены внешних изображений в `images.remotePatterns` (Cloudinary, Google Drive и т.д.)

**Обновить `lib/tutors.ts`:** добавить `imageUrl` в SELECT и использовать его если `image` пустой:
```typescript
imageUrl: row.imageUrl ?? (row.image ? `${botBaseUrl}/static/${row.image}` : null)
```

---

## Единая база данных — Neon

Бот, лендинг, Mini App и cron используют **одну БД — Neon PostgreSQL**.

Текущее состояние:
- Лендинг: уже подключён к Neon через `DATABASE_URL`
- Бот: подключён к `localhost` (dev-настройка), нужно переключить на Neon в проде

Изменения в боте:
1. Обновить `db.js` — добавить поддержку `DATABASE_URL` (приоритет над отдельными переменными)
2. В продакшн `.env` бота заменить `DB_HOST/DB_NAME/...` на `DATABASE_URL=<Neon connection string>`

```javascript
// db.js — добавить поддержку DATABASE_URL
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres', ssl: { rejectUnauthorized: false } })
  : new Sequelize(dbName, dbUser, dbPassword, { dialect: 'postgres', host: dbHost, port: dbPort })
```

---

## ENV переменные

### Landing / Netlify
```
NOTION_TOKEN=          # уже есть
NOTION_TEACHERS_DB_ID= # ID новой базы Teachers в Notion — добавить
DATABASE_URL=          # уже есть (Neon)
```

### Bot (продакшн)
```
DATABASE_URL=          # Neon connection string — заменяет DB_HOST/DB_NAME/...
NOTION_TOKEN=          # тот же токен что у лендинга — добавить
NOTION_TEACHERS_DB_ID= # тот же ID базы — добавить
```

---

## Обработка ошибок

| Сценарий | Поведение |
|---|---|
| Notion API недоступен при создании через бота | Анкета сохраняется в PostgreSQL, `notionPageId = null`. Cron не сможет синкать её двусторонне, но данные не теряются |
| Notion API недоступен во время cron | Cron завершается с ошибкой, ничего не удаляется. Следующий запуск через 5 мин |
| Запись удалена в Notion | Cron удаляет из PostgreSQL при следующем запуске |
| Внешний URL фото недоступен | Лендинг отображает placeholder (обработать в компоненте Tutors) |

---

## Расширяемость

Добавление нового поля в будущем:
1. Добавить свойство в Notion базу
2. Добавить колонку в PostgreSQL (миграция Sequelize)
3. Добавить маппинг в cron-функцию
4. Обновить Sequelize-модель `TeacherAnketa`

---

## Что не входит в этот scope

- Создание самой Notion-базы Teachers (ручная настройка администратором)
- Mini App — читает из PostgreSQL, изменений не требует после миграции
- Аналитика и логи синка (Фаза 4)
