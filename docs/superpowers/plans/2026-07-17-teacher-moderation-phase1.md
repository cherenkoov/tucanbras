# Фаза 1 — Модерация учителей в приложении: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить Notion-админку учителей модерацией в приложении: статус анкеты `draft → pending → approved`, одобрение в админке tucan, гибридный автоперевод (имя+цитата через Claude API, теги словарём), лендинг показывает только approved.

**Architecture:** Три репозитория. `tucan-bot` (Express+Sequelize) получает поле `status`, эндпоинты submit-for-review / set-status / translate. `tucan` (CRA-админка) получает бейджи, кнопки модерации и поля переводов в `AnketsList`. `landing` (Next.js) фильтрует `status='approved'` и переводит теги локальным словарём. Общая БД — Postgres `tukan` на VPS.

**Tech Stack:** Node/Express 5, Sequelize 6, `@anthropic-ai/sdk` (новая зависимость бота), React (CRA), Next.js 16, `node --test` (бот), `tsx --test` (лендинг).

**Спека:** `TucanBRAS/docs/superpowers/specs/2026-07-17-notion-removal-design.md`, раздел «Фаза 1».

## Global Constraints

- Репозитории и ветки: `c:\active-projects\tucan-bot` → ветка `feat/anketa-moderation`; `c:\active-projects\tucan` → ветка `feat/anketa-moderation-admin`; `c:\active-projects\TucanBRAS` → ветка `feat/teacher-moderation`. **TucanBRAS: рабочее дерево грязное несвязанной работой (adaptive-heading)** — задачи 8–10 выполнять в worktree от `main` (skill `superpowers:using-git-worktrees`), коммитить только файлы задач.
- Статусы анкеты — ровно три строки: `'draft' | 'pending' | 'approved'`. Дефолт `'draft'`. Админ может выставлять только `'approved'` и `'draft'`.
- Модель перевода — ровно `claude-opus-4-8` (не менять и не «удешевлять»). Перевод НИКОГДА не сохраняется автоматически — только возврат черновика админке.
- Переводится только свободный текст (`fullName`, `quote`). Теги (специализации/интересы) — словарём в лендинге, через API не переводить.
- В боте нет тестового раннера — используем встроенный `node --test` (Node ≥ 18; `@anthropic-ai/sdk` тоже требует ≥ 18). В лендинге — `npx tsx --test`.
- Все ответы бота с анкетой сохраняют текущий формат: `{ anketa: { ...toJSON(), image: '/static/<file>' | null } }`.
- Никаких обращений к Notion ни в каком новом коде.

## Контекст для исполнителя (обязательно к прочтению)

- **Бот**: контроллер анкет — `controllers/teacherAnketaController.js` (класс, экспорт `new TeacherAnketaController()`; вверху файла module-level хелпер `sendTgAnketaNotify(anketa, user, imagePath, action, updatedFields)` — шлёт уведомление в TG-группу поддержки `SUPPORT_GROUP_ID` ботом `BOT_TOKEN`). Роуты — `routes/teacherAnketaRouter.js`, ошибки — `error/ApiError` (`ApiError.badRequest(msg)` / `ApiError.internal(msg)` в `next(...)`). Роли проверяет `middleware/checkRoleMiddleware.js` (кладёт JWT-payload в `req.user`). Модель — `models/teacherAnketa.js`; при старте сервер делает `sequelize.sync({ alter: { drop: false } })`, поэтому новая колонка в модели появится в таблице сама, **но существующие строки получат дефолт `'draft'`** — это чинит SQL из задачи 1 (выполнить на VPS ДО деплоя бота, см. Runbook).
- **Админка tucan**: `src/pages/Profile/AdminOwnerProfile/AnketsList.jsx` — грид анкет, редактирование через переиспользуемый `AnketaCard`, сохранение `PUT /teacher-anketa/admin-update/:id` (multipart FormData). HTTP-клиент — `api` из `src/http` (axios с JWT). Референс стиля бейджей — `TeacherModerationPage.jsx` в той же папке.
- **Лендинг**: `landing/lib/tutors.ts` читает `TeacherAnketas` напрямую из Postgres (`landing/lib/db.ts`). Локаль-фолбэк: en/pt → ru при пустом переводе (функция `pick`).
- **Фиксированные списки тегов** (источник — `tucan/src/pages/Profile/TeacherProfile/Anketa/AnketaCard.jsx:90-101`): специализации `['Разговорная практика', 'CELPE-BRAS', 'Носитель языка']`; интересы `['Музыка', 'Бразильская кухня', 'Кино', 'Литература', 'Путешествия', 'Футбол', 'Баскетбол', 'Волейбол', 'История']`.

---

### Task 1: SQL-миграция статуса (репо TucanBRAS)

**Files:**
- Create: `landing/migrations/008_teacher_status.sql`

**Interfaces:**
- Produces: колонка `TeacherAnketas.status` (enum `draft|pending|approved`, NOT NULL, default `draft`), существующие строки → `approved`. Имена типа/колонки совпадают с тем, что создал бы Sequelize — `sync({alter})` бота увидит колонку готовой и не тронет её.

- [ ] **Step 1: Создать файл миграции**

```sql
-- 008: статус модерации анкеты учителя (Фаза 1 отказа от Notion)
-- ВЫПОЛНИТЬ НА VPS ДО деплоя бота с новой моделью:
-- бот на старте делает sync({alter}) и добавил бы колонку с дефолтом 'draft',
-- из-за чего до ручного UPDATE лендинг и выбор преподавателя опустели бы.
-- Тип и колонка названы так, как их создал бы Sequelize.

DO $$ BEGIN
  CREATE TYPE "enum_TeacherAnketas_status" AS ENUM ('draft', 'pending', 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TeacherAnketas"
  ADD COLUMN IF NOT EXISTS status "enum_TeacherAnketas_status" NOT NULL DEFAULT 'draft';

-- Все анкеты, существовавшие до модерации, считаются одобренными:
-- именно они сейчас показываются на лендинге и в выборе преподавателя.
UPDATE "TeacherAnketas" SET status = 'approved';
```

- [ ] **Step 2: Проверить синтаксис на локальном Postgres (docker-compose лендинга)**

Run (из `landing/`): `docker compose up -d && docker compose exec -T postgres psql -U postgres -d postgres -c "CREATE TABLE IF NOT EXISTS \"TeacherAnketas\" (id SERIAL PRIMARY KEY)" && docker compose exec -T postgres psql -U postgres -d postgres -f - < migrations/008_teacher_status.sql`
Expected: `CREATE TYPE` (или молча), `ALTER TABLE`, `UPDATE 0` без ошибок. (Если docker недоступен — ревью SQL глазами и пометка в PR, что прогон будет на VPS.)

- [ ] **Step 3: Commit**

```bash
git add migrations/008_teacher_status.sql
git commit -m "feat(db): статус модерации анкеты учителя (008)"
```

---

### Task 2: Модель + тестовая инфраструктура (репо tucan-bot)

**Files:**
- Modify: `models/teacherAnketa.js` (после поля `userId`… добавить `status` рядом с `fullName`)
- Modify: `package.json` (скрипт `test`)
- Test: `test/model-status.test.js`

**Interfaces:**
- Produces: `TeacherAnketa.rawAttributes.status` — ENUM `['draft','pending','approved']`, `defaultValue: 'draft'`, `allowNull: false`. Все ответы `toJSON()` теперь включают `status` — фронт читает его без доп. изменений.

- [ ] **Step 1: Добавить test-скрипт в package.json**

В `"scripts"` добавить строку:

```json
"test": "node --test test/"
```

- [ ] **Step 2: Написать падающий тест**

`test/model-status.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TeacherAnketa } = require('../models/teacherAnketa');

test('TeacherAnketa.status: enum draft|pending|approved, дефолт draft', () => {
  const attr = TeacherAnketa.rawAttributes.status;
  assert.ok(attr, 'колонка status объявлена в модели');
  assert.deepEqual(attr.values, ['draft', 'pending', 'approved']);
  assert.equal(attr.defaultValue, 'draft');
  assert.equal(attr.allowNull, false);
});
```

- [ ] **Step 3: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `колонка status объявлена в модели` (attr === undefined).

- [ ] **Step 4: Добавить поле в модель**

В `models/teacherAnketa.js` после блока `fullName: {...},` вставить:

```js
  // Статус модерации (Фаза 1 отказа от Notion): draft → pending → approved.
  // Публичность выводится из status === 'approved' (лендинг и publicGetAll).
  status: {
    type: DataTypes.ENUM('draft', 'pending', 'approved'),
    allowNull: false,
    defaultValue: 'draft'
  },
```

- [ ] **Step 5: Убедиться, что тест проходит**

Run: `npm test`
Expected: PASS (1 tests, 0 failures).

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/anketa-moderation
git add models/teacherAnketa.js package.json test/model-status.test.js
git commit -m "feat: статус модерации анкеты draft/pending/approved + node --test"
```

---

### Task 3: Хелпер переходов статуса (репо tucan-bot)

**Files:**
- Create: `services/anketaStatus.js`
- Test: `test/anketa-status.test.js`

**Interfaces:**
- Produces: `canSubmitForReview(status: string): boolean` (true только для `'draft'`); `isAdminSettableStatus(status: string): boolean` (true для `'approved'` и `'draft'`); константы `ANKETA_STATUSES`, `ADMIN_SETTABLE_STATUSES`. Их используют задачи 4 и 5.

- [ ] **Step 1: Написать падающий тест**

`test/anketa-status.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { canSubmitForReview, isAdminSettableStatus } = require('../services/anketaStatus');

test('canSubmitForReview: только из draft', () => {
  assert.equal(canSubmitForReview('draft'), true);
  assert.equal(canSubmitForReview('pending'), false);
  assert.equal(canSubmitForReview('approved'), false);
  assert.equal(canSubmitForReview(undefined), false);
});

test('isAdminSettableStatus: только approved и draft', () => {
  assert.equal(isAdminSettableStatus('approved'), true);
  assert.equal(isAdminSettableStatus('draft'), true);
  assert.equal(isAdminSettableStatus('pending'), false);
  assert.equal(isAdminSettableStatus('anything'), false);
});
```

- [ ] **Step 2: Запустить — тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../services/anketaStatus'`.

- [ ] **Step 3: Реализовать хелпер**

`services/anketaStatus.js`:

```js
// Статусная модель анкеты учителя (спека 2026-07-17-notion-removal-design, Фаза 1).
const ANKETA_STATUSES = ['draft', 'pending', 'approved'];
// Админ одобряет или возвращает на доработку; в pending переводит только сам учитель.
const ADMIN_SETTABLE_STATUSES = ['approved', 'draft'];

const canSubmitForReview = (status) => status === 'draft';
const isAdminSettableStatus = (status) => ADMIN_SETTABLE_STATUSES.includes(status);

module.exports = { ANKETA_STATUSES, ADMIN_SETTABLE_STATUSES, canSubmitForReview, isAdminSettableStatus };
```

- [ ] **Step 4: Тесты зелёные**

Run: `npm test`
Expected: PASS (все тесты).

- [ ] **Step 5: Commit**

```bash
git add services/anketaStatus.js test/anketa-status.test.js
git commit -m "feat: хелпер переходов статуса анкеты"
```

---

### Task 4: Эндпоинт «Отправить на проверку» (репо tucan-bot)

**Files:**
- Modify: `controllers/teacherAnketaController.js`
- Modify: `routes/teacherAnketaRouter.js`

**Interfaces:**
- Consumes: `canSubmitForReview` из Task 3; `sendTgAnketaNotify` (уже в файле контроллера).
- Produces: `POST /api/teacher-anketa/submit-for-review` (роли TEACHER/ADMIN/OWNER, без тела) → `{ anketa }` со `status: 'pending'`. Его будет дёргать teacher-UX трека Costa.

- [ ] **Step 1: Импорт хелпера в контроллер**

Вверху `controllers/teacherAnketaController.js`, после существующих `require`:

```js
const { canSubmitForReview, isAdminSettableStatus } = require('../services/anketaStatus');
```

- [ ] **Step 2: Добавить метод в класс `TeacherAnketaController`** (рядом с `update`)

```js
  // Учитель отправляет заполненную анкету на модерацию: draft → pending.
  async submitForReview(req, res, next) {
    try {
      const { id: userId } = req.user;
      const anketa = await TeacherAnketa.findOne({ where: { userId } });
      if (!anketa) return next(ApiError.badRequest('Анкета не найдена'));
      if (!canSubmitForReview(anketa.status)) {
        return next(ApiError.badRequest('Анкета уже на проверке или одобрена'));
      }

      anketa.status = 'pending';
      await anketa.save();

      const user = await User.findByPk(userId);
      await sendTgAnketaNotify(anketa, user, anketa.image, 'отправил на проверку');

      return res.json({
        anketa: {
          ...anketa.toJSON(),
          image: anketa.image ? `/static/${anketa.image}` : null
        }
      });
    } catch (e) {
      console.error('submitForReview error:', e);
      next(ApiError.internal(e.message));
    }
  }
```

- [ ] **Step 3: Роут**

В `routes/teacherAnketaRouter.js` после строки с `/update-image`:

```js
router.post('/submit-for-review', authMiddleware, checkRole(TEACHER_ROLES), teacherAnketaController.submitForReview);
```

- [ ] **Step 4: Синтаксис-проверка**

Run: `node --check controllers/teacherAnketaController.js && node --check routes/teacherAnketaRouter.js && npm test`
Expected: без вывода у `--check`; тесты PASS.

- [ ] **Step 5: Commit**

```bash
git add controllers/teacherAnketaController.js routes/teacherAnketaRouter.js
git commit -m "feat: submit-for-review — отправка анкеты на модерацию"
```

---

### Task 5: Эндпоинт смены статуса админом + фильтр публичного списка (репо tucan-bot)

**Files:**
- Modify: `controllers/teacherAnketaController.js`
- Modify: `routes/teacherAnketaRouter.js`

**Interfaces:**
- Consumes: `isAdminSettableStatus` из Task 3.
- Produces: `PUT /api/teacher-anketa/:id/status` (ADMIN/OWNER, JSON `{ "status": "approved" | "draft" }`) → `{ anketa }`; TG-уведомление учителю лично. `publicGetAll` теперь отдаёт только `status='approved'` — это использует и выбор преподавателя в приложении. Кнопки в задаче 6 бьют ровно в этот эндпоинт.

- [ ] **Step 1: Module-level хелпер личного уведомления** — в `controllers/teacherAnketaController.js`, сразу после функции `sendTgAnketaNotify`:

```js
// Личное уведомление учителю (в отличие от sendTgAnketaNotify, которая шлёт в группу поддержки).
const sendTgToTeacher = async (user, text) => {
  const botToken = process.env.BOT_TOKEN;
  if (!botToken || !user?.telegramId) return;
  try {
    const notifyBot = new TelegramBot(botToken, { polling: false });
    await notifyBot.sendMessage(user.telegramId, text);
  } catch (e) {
    console.error('TG уведомление учителю — ошибка:', e.message);
  }
};
```

- [ ] **Step 2: Метод `setStatus` в классе** (рядом с `adminUpdate`)

```js
  // Модерация: админ одобряет анкету или возвращает на доработку.
  async setStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!isAdminSettableStatus(status)) {
        return next(ApiError.badRequest('Недопустимый статус: ' + status));
      }

      const anketa = await TeacherAnketa.findByPk(id, { include: User });
      if (!anketa) return next(ApiError.badRequest('Анкета не найдена'));

      anketa.status = status;
      await anketa.save();

      const user = anketa.User || await User.findByPk(anketa.userId);
      const text = status === 'approved'
        ? '🎉 Ваша анкета одобрена и опубликована! Ученики теперь видят вас в списке преподавателей.'
        : '✏️ Анкета возвращена на доработку. Поправьте её в приложении и отправьте на проверку снова.';
      await sendTgToTeacher(user, text);

      return res.json({
        anketa: {
          ...anketa.toJSON(),
          image: anketa.image ? `/static/${anketa.image}` : null
        }
      });
    } catch (e) {
      console.error('setStatus error:', e);
      next(ApiError.internal(e.message));
    }
  }
```

- [ ] **Step 3: Фильтр в `publicGetAll`** — заменить начало запроса:

```js
      const ankets = await TeacherAnketa.findAll({
        include: [{
          model: User,
          attributes: ['id', 'userName', 'telegramId']
        }]
      });
```

на:

```js
      // Публично видны только одобренные анкеты (Фаза 1 модерации).
      const ankets = await TeacherAnketa.findAll({
        where: { status: 'approved' },
        include: [{
          model: User,
          attributes: ['id', 'userName', 'telegramId']
        }]
      });
```

- [ ] **Step 4: Роут** — в `routes/teacherAnketaRouter.js` после строки `admin-update`:

```js
router.put('/:id/status', authMiddleware, checkRole(['ADMIN', 'OWNER']), teacherAnketaController.setStatus);
```

- [ ] **Step 5: Проверка**

Run: `node --check controllers/teacherAnketaController.js && node --check routes/teacherAnketaRouter.js && npm test`
Expected: чисто; тесты PASS.

- [ ] **Step 6: Commit**

```bash
git add controllers/teacherAnketaController.js routes/teacherAnketaRouter.js
git commit -m "feat: смена статуса анкеты админом + публичный список только approved"
```

---

### Task 6: Переводы в admin-update + эндпоинт автоперевода (репо tucan-bot)

**Files:**
- Create: `services/anketaTranslate.js`
- Modify: `controllers/teacherAnketaController.js`
- Modify: `routes/teacherAnketaRouter.js`
- Modify: `package.json` (зависимость `@anthropic-ai/sdk`)
- Test: `test/anketa-translate.test.js`

**Interfaces:**
- Produces: `POST /api/teacher-anketa/:id/translate` (ADMIN/OWNER) → `{ translations: { fullName_en, fullName_pt, quote_en, quote_pt } }` — черновик, ничего не сохраняет. `adminUpdate` принимает эти же 4 поля в multipart-теле. Требует `ANTHROPIC_API_KEY` в env.

- [ ] **Step 1: Установить SDK**

Run: `npm install @anthropic-ai/sdk`
Expected: added в dependencies, без ошибок (Node ≥ 18).

- [ ] **Step 2: Написать падающий тест**

`test/anketa-translate.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildTranslateRequest, parseTranslateResponse } = require('../services/anketaTranslate');

test('buildTranslateRequest: модель claude-opus-4-8, structured outputs, исходники в промпте', () => {
  const req = buildTranslateRequest({ fullName: 'Мария Силва', quote: 'Учить — значит жить' });
  assert.equal(req.model, 'claude-opus-4-8');
  assert.equal(req.output_config.format.type, 'json_schema');
  assert.deepEqual(
    Object.keys(req.output_config.format.schema.properties).sort(),
    ['fullName_en', 'fullName_pt', 'quote_en', 'quote_pt']
  );
  assert.equal(req.output_config.format.schema.additionalProperties, false);
  const userContent = req.messages[0].content;
  assert.ok(userContent.includes('Мария Силва'));
  assert.ok(userContent.includes('Учить — значит жить'));
  assert.ok(req.system.includes('бразильск'), 'промпт требует бразильский португальский');
});

test('parseTranslateResponse: разбирает текстовый блок с JSON', () => {
  const parsed = parseTranslateResponse({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: '{"fullName_en":"Maria Silva","fullName_pt":"Maria Silva","quote_en":"To teach is to live","quote_pt":"Ensinar é viver"}' }]
  });
  assert.equal(parsed.fullName_en, 'Maria Silva');
  assert.equal(parsed.quote_pt, 'Ensinar é viver');
});

test('parseTranslateResponse: refusal → ошибка', () => {
  assert.throws(() => parseTranslateResponse({ stop_reason: 'refusal', content: [] }));
});
```

- [ ] **Step 3: Запустить — падает**

Run: `npm test`
Expected: FAIL — `Cannot find module '../services/anketaTranslate'`.

- [ ] **Step 4: Реализовать сервис**

`services/anketaTranslate.js`:

```js
// Автоперевод-черновик анкеты (гибрид, спека 2026-07-17): только свободный текст.
// Теги переводятся словарём на лендинге и сюда НЕ попадают.
const TRANSLATE_MODEL = 'claude-opus-4-8';

const TRANSLATE_SCHEMA = {
  type: 'object',
  properties: {
    fullName_en: { type: 'string', description: 'Имя латиницей (транслитерация, не перевод)' },
    fullName_pt: { type: 'string', description: 'Имя латиницей для португалоязычной аудитории (обычно совпадает с en)' },
    quote_en: { type: 'string', description: 'Перевод цитаты на естественный английский' },
    quote_pt: { type: 'string', description: 'Перевод цитаты на бразильский португальский' }
  },
  required: ['fullName_en', 'fullName_pt', 'quote_en', 'quote_pt'],
  additionalProperties: false
};

const SYSTEM_PROMPT = [
  'Ты переводишь анкеты преподавателей онлайн-школы бразильского португальского TucanBRAS.',
  'На входе JSON {"fullName": "...", "quote": "..."} на русском.',
  'fullName_en и fullName_pt — транслитерация имени латиницей, не перевод.',
  'quote_en — естественный английский; quote_pt — БРАЗИЛЬСКИЙ португальский (não use português europeu).',
  'Сохраняй тёплый живой тон оригинала. Если исходное поле пустое — верни пустую строку.'
].join(' ');

function buildTranslateRequest({ fullName, quote }) {
  return {
    model: TRANSLATE_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: JSON.stringify({ fullName: fullName || '', quote: quote || '' })
    }],
    output_config: { format: { type: 'json_schema', schema: TRANSLATE_SCHEMA } }
  };
}

function parseTranslateResponse(response) {
  if (response.stop_reason === 'refusal') {
    throw new Error('Модель отклонила запрос (refusal)');
  }
  const textBlock = (response.content || []).find((b) => b.type === 'text');
  if (!textBlock) throw new Error('В ответе модели нет текстового блока');
  return JSON.parse(textBlock.text);
}

module.exports = { TRANSLATE_MODEL, TRANSLATE_SCHEMA, buildTranslateRequest, parseTranslateResponse };
```

- [ ] **Step 5: Тесты зелёные**

Run: `npm test`
Expected: PASS (все тесты).

- [ ] **Step 6: Метод `translate` в контроллере** — импорт вверху файла:

```js
const { buildTranslateRequest, parseTranslateResponse } = require('../services/anketaTranslate');
```

и метод в классе (рядом с `adminUpdate`):

```js
  // Черновик перевода (Claude API). Ничего не сохраняет — админ вычитывает
  // и сохраняет через admin-update.
  async translate(req, res, next) {
    try {
      const { id } = req.params;
      const anketa = await TeacherAnketa.findByPk(id);
      if (!anketa) return next(ApiError.badRequest('Анкета не найдена'));
      if (!process.env.ANTHROPIC_API_KEY) {
        return next(ApiError.internal('ANTHROPIC_API_KEY не задан в env'));
      }

      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic();
      const response = await client.messages.create(
        buildTranslateRequest({ fullName: anketa.fullName, quote: anketa.quote })
      );

      return res.json({ translations: parseTranslateResponse(response) });
    } catch (e) {
      console.error('translate error:', e);
      next(ApiError.internal('Ошибка перевода: ' + e.message));
    }
  }
```

- [ ] **Step 7: Переводы в `adminUpdate`** — в методе `adminUpdate`, после блока обработки `contacts` (перед `let imageChanged = false;`) вставить:

```js
      // Переводы свободного текста для лендинга (руками или из /translate).
      for (const field of ['fullName_en', 'fullName_pt', 'quote_en', 'quote_pt']) {
        if (req.body[field] !== undefined && req.body[field] !== anketa[field]) {
          updatedFields[field] = true;
          anketa[field] = req.body[field];
        }
      }
```

- [ ] **Step 8: Роут** — в `routes/teacherAnketaRouter.js` после строки `/:id/status`:

```js
router.post('/:id/translate', authMiddleware, checkRole(['ADMIN', 'OWNER']), teacherAnketaController.translate);
```

- [ ] **Step 9: Проверка**

Run: `node --check controllers/teacherAnketaController.js && node --check routes/teacherAnketaRouter.js && npm test`
Expected: чисто; тесты PASS.

- [ ] **Step 10: Commit**

```bash
git add services/anketaTranslate.js test/anketa-translate.test.js controllers/teacherAnketaController.js routes/teacherAnketaRouter.js package.json package-lock.json
git commit -m "feat: автоперевод-черновик анкеты (Claude API) + переводы в admin-update"
```

---

### Task 7: Админка — бейдж статуса и кнопки модерации (репо tucan)

**Files:**
- Modify: `src/pages/Profile/AdminOwnerProfile/AnketsList.jsx`

**Interfaces:**
- Consumes: `GET /teacher-anketa/all` теперь возвращает `status` в каждой анкете (Task 2); `PUT /teacher-anketa/:id/status` (Task 5).

- [ ] **Step 1: Константы статуса** — в `AnketsList.jsx` после строки `const BACKEND_BASE = ...`:

```js
const statusLabel = { draft: 'Черновик', pending: 'На проверке', approved: 'Одобрена' };
const statusStyle = (status) => {
  const base = { padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginLeft: 8, whiteSpace: 'nowrap' };
  if (status === 'approved') return { ...base, background: 'rgba(40,167,69,0.14)', color: '#1e7e34' };
  if (status === 'pending') return { ...base, background: 'rgba(255,193,7,0.18)', color: '#b98900' };
  return { ...base, background: 'rgba(108,117,125,0.14)', color: '#495057' };
};
```

- [ ] **Step 2: Обработчик смены статуса** — внутри компонента, после `saveEdit`:

```js
  const setStatus = async (id, status) => {
    const confirmText = status === 'approved'
      ? 'Одобрить анкету? Она появится на лендинге и в выборе преподавателя.'
      : 'Вернуть анкету на доработку? Она пропадёт из публичных списков.';
    if (!window.confirm(confirmText)) return;
    try {
      await api.put(`/teacher-anketa/${id}/status`, { status });
      await fetchAnkets(false);
    } catch (err) {
      alert('Ошибка смены статуса: ' + (err.response?.data?.message || err.message));
    }
  };
```

- [ ] **Step 3: Бейдж и кнопки в шапке карточки** — в JSX внутри `<div className="anketa-header">`, сразу после `<h3>…</h3>`:

```jsx
                  <span style={statusStyle(anketa.status)}>{statusLabel[anketa.status] || anketa.status}</span>
                  {!isEdit && anketa.status !== 'approved' && (
                    <button onClick={() => setStatus(anketa.id, 'approved')} className="save-btn">Одобрить</button>
                  )}
                  {!isEdit && anketa.status !== 'draft' && (
                    <button onClick={() => setStatus(anketa.id, 'draft')} className="cancel-btn">Вернуть на доработку</button>
                  )}
```

- [ ] **Step 4: Проверка сборки**

Run: `npm run build`
Expected: `Compiled successfully` (варнинги допустимы, ошибок нет).

- [ ] **Step 5: Ручная проверка** (бот из Task 6 запущен локально, вход админом): в списке анкет виден бейдж; «Одобрить» на draft-анкете → confirm → бейдж «Одобрена», у учителя в TG личное сообщение; «Вернуть на доработку» → бейдж «Черновик».

- [ ] **Step 6: Commit**

```bash
git checkout -b feat/anketa-moderation-admin
git add src/pages/Profile/AdminOwnerProfile/AnketsList.jsx
git commit -m "feat: бейдж статуса и кнопки модерации анкет в админке"
```

---

### Task 8: Админка — поля переводов + «Перевести автоматически» (репо tucan)

**Files:**
- Modify: `src/pages/Profile/AdminOwnerProfile/AnketsList.jsx`
- Modify: `src/pages/Profile/css/AnketsList.css`

**Interfaces:**
- Consumes: `POST /teacher-anketa/:id/translate` → `{ translations: { fullName_en, fullName_pt, quote_en, quote_pt } }` (Task 6); `admin-update` принимает эти поля (Task 6).

- [ ] **Step 1: Расширить `startEdit`** — в объект `formData` внутри `startEdit` добавить (после `levels: anketa.levels || []`):

```js
          levels: anketa.levels || [],
          fullName_en: anketa.fullName_en || '',
          fullName_pt: anketa.fullName_pt || '',
          quote_en: anketa.quote_en || '',
          quote_pt: anketa.quote_pt || ''
```

(заменить прежнюю строку `levels: anketa.levels || []` этим блоком — не забыть запятую.)

- [ ] **Step 2: Расширить `saveEdit`** — после `data.append('levels', ...)` добавить:

```js
      data.append('fullName_en', state.formData.fullName_en || '');
      data.append('fullName_pt', state.formData.fullName_pt || '');
      data.append('quote_en', state.formData.quote_en || '');
      data.append('quote_pt', state.formData.quote_pt || '');
```

- [ ] **Step 3: Обработчик перевода** — внутри компонента, после `setStatus`:

```js
  // Черновик перевода: заполняет ТОЛЬКО пустые поля, ручной ввод не затирает.
  const translateEdit = async (id) => {
    setEditStates(prev => ({ ...prev, [id]: { ...prev[id], translateLoading: true } }));
    try {
      const { data } = await api.post(`/teacher-anketa/${id}/translate`, {}, { timeout: 60000 });
      const t = data.translations || {};
      setEditStates(prev => {
        const fd = prev[id].formData;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            formData: {
              ...fd,
              fullName_en: fd.fullName_en || t.fullName_en || '',
              fullName_pt: fd.fullName_pt || t.fullName_pt || '',
              quote_en: fd.quote_en || t.quote_en || '',
              quote_pt: fd.quote_pt || t.quote_pt || ''
            }
          }
        };
      });
    } catch (err) {
      alert('Ошибка перевода: ' + (err.response?.data?.message || err.message));
    } finally {
      setEditStates(prev => ({ ...prev, [id]: { ...prev[id], translateLoading: false } }));
    }
  };
```

- [ ] **Step 4: Блок переводов в JSX** — внутри `.anketa-wrapper`, сразу после `<AnketaCard ... />`:

```jsx
                {isEdit && (
                  <div className="anketa-translations">
                    <div className="anketa-translations-header">
                      <h4>Переводы для лендинга (en / pt-BR)</h4>
                      <button
                        onClick={() => translateEdit(anketa.id)}
                        disabled={editStates[anketa.id]?.translateLoading}
                        className="edit-btn"
                      >
                        {editStates[anketa.id]?.translateLoading ? 'Перевожу…' : 'Перевести автоматически'}
                      </button>
                    </div>
                    <label>Имя (en)
                      <input value={formData.fullName_en || ''} onChange={(e) => handleChange(anketa.id, 'fullName_en', e.target.value)} />
                    </label>
                    <label>Имя (pt)
                      <input value={formData.fullName_pt || ''} onChange={(e) => handleChange(anketa.id, 'fullName_pt', e.target.value)} />
                    </label>
                    <label>Цитата (en)
                      <textarea rows={2} value={formData.quote_en || ''} onChange={(e) => handleChange(anketa.id, 'quote_en', e.target.value)} />
                    </label>
                    <label>Цитата (pt)
                      <textarea rows={2} value={formData.quote_pt || ''} onChange={(e) => handleChange(anketa.id, 'quote_pt', e.target.value)} />
                    </label>
                  </div>
                )}
```

- [ ] **Step 5: Стили** — в конец `src/pages/Profile/css/AnketsList.css`:

```css
/* Переводы анкеты для лендинга (Фаза 1 модерации) */
.anketa-translations {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  display: grid;
  gap: 8px;
}
.anketa-translations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.anketa-translations label {
  display: grid;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}
.anketa-translations input,
.anketa-translations textarea {
  font: inherit;
  font-weight: 400;
  padding: 6px 10px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
}
```

- [ ] **Step 6: Проверка сборки**

Run: `npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 7: Ручная проверка** (локальный бот + `ANTHROPIC_API_KEY` в его `.env`): «Редактировать» анкету → блок переводов виден; «Перевести автоматически» → поля заполняются (pt — бразильский, имя латиницей), уже заполненные руками поля не затираются; «Сохранить» → повторное открытие показывает сохранённые переводы.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Profile/AdminOwnerProfile/AnketsList.jsx src/pages/Profile/css/AnketsList.css
git commit -m "feat: поля переводов анкеты и автоперевод-черновик в админке"
```

---

### Task 9: Лендинг — словарь тегов (репо TucanBRAS, worktree от main)

**Files:**
- Create: `landing/lib/tagTranslations.ts`
- Test: `landing/lib/tagTranslations.test.ts`

**Interfaces:**
- Produces: `translateTags(tags: string[] | null, locale: Locale): string[]` и `translateTag(tag: string, locale: Locale): string` — ru возвращается как есть, en/pt по словарю, незнакомый тег фолбэкается на ru. Использует Task 10.

- [ ] **Step 1: Написать падающий тест**

`landing/lib/tagTranslations.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { translateTag, translateTags } from './tagTranslations'

test('ru возвращается как есть', () => {
  assert.equal(translateTag('Музыка', 'ru'), 'Музыка')
})

test('en/pt переводятся по словарю', () => {
  assert.equal(translateTag('Музыка', 'en'), 'Music')
  assert.equal(translateTag('Музыка', 'pt'), 'Música')
  assert.equal(translateTag('Носитель языка', 'pt'), 'Falante nativo')
  assert.equal(translateTag('CELPE-BRAS', 'en'), 'CELPE-BRAS')
})

test('незнакомый тег фолбэкается на ru', () => {
  assert.equal(translateTag('Новый тег', 'en'), 'Новый тег')
})

test('translateTags: массив и null', () => {
  assert.deepEqual(translateTags(['Кино', 'Футбол'], 'pt'), ['Cinema', 'Futebol'])
  assert.deepEqual(translateTags(null, 'en'), [])
})
```

- [ ] **Step 2: Запустить — падает**

Run (из `landing/`): `npx tsx --test lib/tagTranslations.test.ts`
Expected: FAIL — `Cannot find module './tagTranslations'`.

- [ ] **Step 3: Реализовать словарь**

`landing/lib/tagTranslations.ts`:

```ts
import type { Locale } from '../types'

// Фиксированные списки из формы анкеты приложения
// (tucan/src/pages/Profile/TeacherProfile/Anketa/AnketaCard.jsx).
// Новый тег в приложении = новая строка здесь, иначе en/pt увидят русский текст.
const TAGS: Record<string, { en: string; pt: string }> = {
  // Специализации
  'Разговорная практика': { en: 'Conversation practice', pt: 'Prática de conversação' },
  'CELPE-BRAS': { en: 'CELPE-BRAS', pt: 'CELPE-BRAS' },
  'Носитель языка': { en: 'Native speaker', pt: 'Falante nativo' },
  // Интересы
  'Музыка': { en: 'Music', pt: 'Música' },
  'Бразильская кухня': { en: 'Brazilian cuisine', pt: 'Culinária brasileira' },
  'Кино': { en: 'Movies', pt: 'Cinema' },
  'Литература': { en: 'Literature', pt: 'Literatura' },
  'Путешествия': { en: 'Travel', pt: 'Viagens' },
  'Футбол': { en: 'Football', pt: 'Futebol' },
  'Баскетбол': { en: 'Basketball', pt: 'Basquete' },
  'Волейбол': { en: 'Volleyball', pt: 'Vôlei' },
  'История': { en: 'History', pt: 'História' },
}

export function translateTag(tag: string, locale: Locale): string {
  if (locale === 'ru') return tag
  return TAGS[tag]?.[locale] ?? tag
}

export function translateTags(tags: string[] | null, locale: Locale): string[] {
  return (tags ?? []).map(tag => translateTag(tag, locale))
}
```

- [ ] **Step 4: Тесты зелёные**

Run: `npx tsx --test lib/tagTranslations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit** (в worktree, ветка `feat/teacher-moderation`)

```bash
git add landing/lib/tagTranslations.ts landing/lib/tagTranslations.test.ts
git commit -m "feat(landing): словарь переводов тегов анкеты (ru→en/pt)"
```

---

### Task 10: Лендинг — фильтр approved + теги словарём (репо TucanBRAS)

**Files:**
- Modify: `landing/lib/tutors.ts`

**Interfaces:**
- Consumes: `translateTags` из Task 9; колонка `status` из Task 1.
- Produces: `getTutors(locale)` — тот же тип `Tutor[]`, но только approved-анкеты; теги локализованы словарём; колонки `specializations_en/pt`, `interests_en/pt` больше не читаются (дроп — в Фазе 4).

- [ ] **Step 1: Заменить содержимое `landing/lib/tutors.ts` целиком**

```ts
import pool from './db'
import { resolveLanguage, type Language } from './languages'
import { translateTags } from './tagTranslations'
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
  interests: string[] | null
}

function pick(ru: string | null, en: string | null, pt: string | null, locale: Locale): string | null {
  if (locale === 'en') return en || ru
  if (locale === 'pt') return pt || ru
  return ru
}

export async function getTutors(locale: Locale = 'en'): Promise<Tutor[]> {
  // Только одобренные анкеты (Фаза 1 модерации). Переводы свободного текста
  // лежат в _en/_pt колонках (заполняет админ), теги переводятся словарём.
  const { rows } = await pool.query<TutorRow>(`
    SELECT
      id, "fullName", "fullName_en", "fullName_pt",
      image, "imageUrl", languages,
      quote, quote_en, quote_pt,
      specializations, interests
    FROM "TeacherAnketas"
    WHERE status = 'approved'
    ORDER BY id ASC
  `)

  const botBaseUrl = process.env.BOT_BASE_URL ?? ''

  return rows.map(row => ({
    id:              row.id,
    fullName:        pick(row.fullName, row.fullName_en, row.fullName_pt, locale) ?? row.fullName,
    imageUrl:        row.imageUrl ?? (row.image ? `${botBaseUrl}/static/${row.image}` : null),
    languages:       (row.languages ?? []).map(resolveLanguage),
    quote:           pick(row.quote, row.quote_en, row.quote_pt, locale),
    specializations: translateTags(row.specializations, locale),
    interests:       translateTags(row.interests, locale),
  }))
}
```

- [ ] **Step 2: Проверка типов и сборки**

Run (из `landing/`): `npx tsc --noEmit && npm run build`
Expected: без ошибок типов; `next build` проходит (запросы к БД на билде могут фолбэкнуться — это штатно, `getTutors` в page.tsx обёрнут в `.catch(() => [])`).

- [ ] **Step 3: Commit**

```bash
git add landing/lib/tutors.ts
git commit -m "feat(landing): карточки учителей — только approved, теги словарём"
```

---

### Task 11: Лендинг — удалить мёртвый Notion-синк учителей (репо TucanBRAS)

**Files:**
- Delete: `landing/netlify/functions/sync-teachers.ts`
- Delete: `landing/scripts/create-notion-teachers-db.mjs`
- Delete: `landing/scripts/setup-notion-teachers-schema.mjs`
- Delete: `landing/scripts/test-sync-teachers.mjs`

**НЕ трогать:** `landing/scripts/snapshot-notion.ts` и `landing/lib/notion.ts` — это CMS-роль Notion, уходит в Фазе 2.

- [ ] **Step 1: Убедиться, что на файлы никто не ссылается**

Run (из `landing/`): `git grep -l "sync-teachers\|create-notion-teachers\|setup-notion-teachers" -- . ':!docs' ':!netlify' ':!scripts'`
Expected: пустой вывод (упоминания только в docs и в самих удаляемых файлах).

- [ ] **Step 2: Удалить**

```bash
git rm netlify/functions/sync-teachers.ts scripts/create-notion-teachers-db.mjs scripts/setup-notion-teachers-schema.mjs scripts/test-sync-teachers.mjs
```

- [ ] **Step 3: Сборка не сломалась**

Run: `npm run build`
Expected: проходит.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(landing): удалить мёртвый Notion-синк учителей (Netlify cron не работает на VPS)"
```

---

## Runbook деплоя (строгий порядок)

1. **SQL до бота.** На VPS: `psql -U <DB_USER> -d tukan -f 008_teacher_status.sql` (файл из задачи 1; скопировать scp или выполнить содержимое вручную). Проверить: `SELECT status, count(*) FROM "TeacherAnketas" GROUP BY 1;` → все `approved`.
2. **tucan-bot.** `cd /var/www/tucan-bot && git pull && npm install` (подтянет `@anthropic-ai/sdk`; проверить `node -v` ≥ 18). В `.env` добавить `ANTHROPIC_API_KEY=...`. `pm2 restart tucan-bot`. Проверить лог старта: sync прошёл, колонку не пересоздавал.
3. **tucan (админка).** Собрать и выложить приложение тем же способом, каким оно деплоится сейчас (`npm run build` + раздача статики; уточнить у владельца текущий механизм).
4. **landing.** `cd /var/www/tucanbras-landing && git pull origin main && cd landing && npm ci && npm run build && pm2 restart tucanbras-landing`.

## Ручная проверка на проде (из спеки, раздел «Верификация — Фаза 1»)

- Лендинг (ru/en/pt): карточки учителей на месте (все старые анкеты — approved); на en/pt теги переведены, имя/цитата фолбэкаются на ru, пока переводы не заполнены.
- Приложение: у студента список «выбери преподавателя» не пуст (те же approved).
- Создать тестовую draft-анкету → её НЕТ на лендинге (после ревалидации ISR ≤ 1 ч; для мгновенной проверки — `curl -X POST` нет, просто дождаться или пересобрать) и НЕТ в выборе преподавателя (мгновенно).
- `POST /teacher-anketa/submit-for-review` тестовым учителем → в TG-группу поддержки пришло «отправил на проверку»; в админке бейдж «На проверке».
- «Одобрить» в админке → учителю личное TG-сообщение; карточка появляется в выборе преподавателя сразу и на лендинге после ревалидации. «Вернуть на доработку» → пропадает из выбора преподавателя.
- «Перевести автоматически» → черновик en/pt (pt — бразильский, имя латиницей), ничего не сохранён до «Сохранить».

## Вне рамок этого плана

- Teacher-UX (баннер «допишите анкету», экран «на проверке», кнопка «Отправить на проверку» в приложении) — трек Costa; эндпоинт уже готов (Task 4).
- CMS лендинга, лиды→онбординг, дроп колонок `notionPageId`/`specializations_en/pt`/`interests_en/pt`, зачистка env и доков — Фазы 2–4 спеки.
